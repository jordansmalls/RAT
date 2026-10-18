<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Model\BSONArray;
use MongoDB\Model\BSONDocument;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Port of the old `downloadClicks` export, streamed instead of buffered.
 *
 * Clicks are read with `ip`, `visitorId` and `visitorVersion` excluded by the query projection,
 * so private fields never reach PHP, let alone the file. JSON matches the old
 * `JSON.stringify(clicks, null, 2)` output. CSV flattens nested documents into dotted
 * columns (the union of keys in first-seen order), quotes every value and leaves null or
 * missing values empty.
 *
 * @phpstan-type ClickMatch array{project: ObjectId, link?: ObjectId}
 */
class ClickExport
{
    public const FORMATS = ['json', 'csv'];

    /**
     * Fields that must never be exported.
     */
    public const PRIVATE_FIELDS = ['ip', 'visitorId', 'visitorVersion'];

    /**
     * Stream a JSON or CSV download of the clicks in scope.
     *
     * @param  ClickMatch  $match
     * @param  'json'|'csv'  $format
     */
    public function download(array $match, string $format, string $projectId): StreamedResponse
    {
        $headers = [
            'Content-Type' => $format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
            'Content-Disposition' => sprintf('attachment; filename="clicks-%s.%s"', $projectId, $format),
            'Cache-Control' => 'no-store, private',
        ];

        return new StreamedResponse(function () use ($match, $format): void {
            $format === 'csv' ? $this->writeCsv($match) : $this->writeJson($match);
        }, 200, $headers);
    }

    /**
     * Write the JSON array, one click at a time, with two-space indentation like the old export.
     *
     * @param  ClickMatch  $match
     */
    public function writeJson(array $match): void
    {
        $isFirst = true;

        foreach ($this->clicks($match) as $click) {
            $json = json_encode(Bson::normalize($click), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR);
            $json = preg_replace_callback('/^( +)/m', fn (array $spaces): string => str_repeat(' ', intdiv(strlen($spaces[1]), 2)), $json);

            echo $isFirst ? "[\n" : ",\n";
            echo preg_replace('/^/m', '  ', $json);
            $isFirst = false;
            $this->flush();
        }

        echo $isFirst ? '[]' : "\n]";
    }

    /**
     * Write the CSV. The header is the union of every click's flattened keys, so the clicks are
     * read twice: once for the header and once for the rows. An empty scope produces an empty file.
     *
     * @param  ClickMatch  $match
     */
    public function writeCsv(array $match): void
    {
        $headers = [];

        foreach ($this->clicks($match) as $click) {
            foreach (array_keys(self::flatten($click)) as $key) {
                $headers[$key] = true;
            }
        }

        if ($headers === []) {
            return;
        }

        $headers = array_keys($headers);
        echo implode(',', $headers)."\n";

        foreach ($this->clicks($match) as $click) {
            $row = self::flatten($click);
            echo implode(',', array_map(fn (string $header): string => self::csvValue($row[$header] ?? null), $headers))."\n";
            $this->flush();
        }
    }

    /**
     * Flatten a click into dotted keys. ObjectIds and dates are leaf values and empty
     * documents contribute no columns.
     *
     * @return array<string, mixed>
     */
    public static function flatten(BSONDocument|array $document, string $prefix = ''): array
    {
        $flat = [];
        $fields = $document instanceof BSONDocument ? $document->getArrayCopy() : $document;

        foreach ($fields as $key => $value) {
            $isDocument = $value instanceof BSONDocument || (is_array($value) && ! array_is_list($value));

            if ($isDocument) {
                $flat += self::flatten($value, $prefix.$key.'.');
            } else {
                $flat[$prefix.$key] = $value;
            }
        }

        return $flat;
    }

    /**
     * Quote one CSV value the way the old export did: `"value"` with quotes doubled, and an
     * empty cell for null or missing values.
     */
    public static function csvValue(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        return '"'.str_replace('"', '""', self::stringify($value)).'"';
    }

    /**
     * JavaScript `String(value)` for exported values. ObjectIds become hex and dates ISO-8601.
     */
    public static function stringify(mixed $value): string
    {
        return match (true) {
            $value instanceof ObjectId => (string) $value,
            $value instanceof UTCDateTime => Bson::isoDate($value),
            $value instanceof BSONArray => implode(',', array_map(fn (mixed $item): string => $item === null ? '' : self::stringify($item), $value->getArrayCopy())),
            is_array($value) => implode(',', array_map(fn (mixed $item): string => $item === null ? '' : self::stringify($item), $value)),
            $value instanceof BSONDocument => '[object Object]',
            is_bool($value) => $value ? 'true' : 'false',
            is_float($value) => json_encode($value == 0.0 ? 0.0 : $value),
            is_scalar($value) => (string) $value,
            default => (string) json_encode(Bson::normalize($value)),
        };
    }

    /**
     * Clicks in scope with private fields excluded by the database projection.
     *
     * @param  ClickMatch  $match
     * @return iterable<BSONDocument>
     */
    protected function clicks(array $match): iterable
    {
        return Collections::clicks()->find($match, [
            'projection' => array_fill_keys(self::PRIVATE_FIELDS, 0),
        ]);
    }

    /**
     * Push written rows to the client. Output buffers are left alone so callers (and tests)
     * that capture the stream still receive every byte.
     */
    protected function flush(): void
    {
        flush();
    }
}
