<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Throwable;
use UnexpectedValueException;

class SocialCountProviders
{
    public const LABELS = ['youtube' => 'YouTube', 'instagram' => 'Instagram', 'twitter' => 'Twitter / X', 'twitch' => 'Twitch'];

    public function normalize(string $platform, string $input): string
    {
        $value = preg_replace('/^@/', '', trim($input));
        $pattern = match ($platform) {
            'youtube' => '/^[\p{L}\p{N}_.\-\x{00b7}]{1,100}$/u',
            'instagram' => '/^[A-Za-z0-9._]{1,30}$/',
            'twitter' => '/^[A-Za-z0-9_]{1,15}$/',
            'twitch' => '/^[A-Za-z0-9_]{1,25}$/',
        };
        if (! preg_match($pattern, $value)) {
            throw new UnexpectedValueException('Enter a valid '.$platform.' '.($platform === 'youtube' ? 'handle or channel ID' : 'username').'.');
        }

        return $value;
    }

    public function fetch(string $platform, string $identifier): array
    {
        $value = $this->normalize($platform, $identifier);

        return $this->readResponse($this->request(Http::withOptions([]))->get($this->url($platform, $value)), $platform, $value);
    }

    /** @return array<string, array|Throwable> */
    public function fetchAll(array $identifiers): array
    {
        $urls = [];
        $results = [];
        foreach ($identifiers as $platform => $identifier) {
            try {
                $urls[$platform] = $this->url($platform, $this->normalize($platform, $identifier));
            } catch (Throwable $error) {
                $results[$platform] = $error;
            }
        }
        $responses = Http::pool(function (Pool $pool) use ($urls): void {
            foreach ($urls as $platform => $url) {
                $this->request($pool->as($platform))->get($url);
            }
        });
        foreach ($responses as $platform => $response) {
            try {
                if ($response instanceof Throwable) {
                    throw $response;
                }
                $results[$platform] = $this->readResponse($response, $platform, $identifiers[$platform]);
            } catch (Throwable $error) {
                $results[$platform] = $error;
            }
        }

        return $results;
    }

    private function url(string $platform, string $value): string
    {
        return match ($platform) {
            'youtube' => 'https://www.youtube.com/'.(preg_match('/^UC[A-Za-z0-9_-]{22}$/', $value) ? 'channel/'.$value : '@'.rawurlencode($value)).'?hl=en',
            'instagram' => 'https://www.instagram.com/'.rawurlencode($value).'/',
            'twitter' => 'https://x.com/'.rawurlencode($value),
        };
    }

    private function request(PendingRequest $request): PendingRequest
    {
        return $request->connectTimeout(3)->timeout(10)->withoutRedirecting()
            ->withHeaders(['Accept-Language' => 'en-US,en;q=0.9', 'Accept' => 'text/html'])
            ->withOptions(['progress' => function (int $downloadTotal, int $downloaded): void {
                if ($downloadTotal > 5 * 1024 * 1024 || $downloaded > 5 * 1024 * 1024) {
                    throw new \RuntimeException('Public profile exceeds the response size limit.');
                }
            }]);
    }

    private function readResponse(Response $response, string $platform, string $identifier): array
    {
        if ($response->redirect()) {
            throw new UnexpectedValueException(self::LABELS[$platform].' did not allow the public profile to be read.');
        }
        $response->throw();
        $html = $response->body();
        if (strlen($html) > 5 * 1024 * 1024) {
            throw new \RuntimeException('Public profile exceeds the response size limit.');
        }

        return match ($platform) {
            'youtube' => $this->parseYouTubePage($html, $identifier),
            'instagram' => $this->parseInstagramPage($html, $identifier),
            'twitter' => $this->parseTwitterPage($html, $identifier),
        };
    }

    public function parseAudienceCount(?string $text, string $label): ?array
    {
        if (! preg_match('/^(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(K|M|B|thousand|million|billion)?\s+'.preg_quote($label, '/').'s?$/i', trim($text ?? ''), $match)) {
            return null;
        }
        if (! empty($match[2]) && empty($match[3])) {
            return null;
        }
        $multiplier = ['k' => 1e3, 'thousand' => 1e3, 'm' => 1e6, 'million' => 1e6, 'b' => 1e9, 'billion' => 1e9];
        $count = round((float) (str_replace(',', '', $match[1]).($match[2] ?? '')) * ($multiplier[strtolower($match[3] ?? '')] ?? 1));
        if ($count < 0 || $count > 9007199254740991 || ! is_finite($count)) {
            return null;
        }

        return ['count' => (int) $count, 'approximate' => ! empty($match[3])];
    }

    public function parseYouTubePage(string $html, string $identifier): array
    {
        $data = $this->youtubeInitialData($html);
        $current = $data['header']['pageHeaderRenderer'] ?? [];
        $legacy = $data['header']['c4TabbedHeaderRenderer'] ?? [];
        $rows = $current['content']['pageHeaderViewModel']['metadata']['contentMetadataViewModel']['metadataRows'] ?? [];
        $candidates = [];
        foreach ($rows as $row) {
            foreach ($row['metadataParts'] ?? [] as $part) {
                $candidates[] = $part['accessibilityLabel'] ?? null;
                $candidates[] = $part['text']['content'] ?? null;
            }
        }
        $candidates[] = $legacy['subscriberCountText']['simpleText'] ?? null;
        $candidates[] = implode('', array_column($legacy['subscriberCountText']['runs'] ?? [], 'text'));
        foreach ($candidates as $candidate) {
            $result = $this->parseAudienceCount(is_string($candidate) ? $candidate : null, 'subscriber');
            if ($result !== null) {
                return ['displayName' => $current['pageTitle'] ?? $legacy['title'] ?? $identifier, ...$result];
            }
        }
        throw $this->unavailable('youtube');
    }

    public function parseInstagramPage(string $html, string $identifier): array
    {
        $xpath = $this->xpath($html);
        $description = $xpath->evaluate('string(//meta[@property="og:description" or @name="og:description"]/@content)');
        $url = parse_url($xpath->evaluate('string(//meta[@property="og:url" or @name="og:url"]/@content)'));
        $result = null;
        if (preg_match('/^([\d,.]+\s*(?:K|M|B|thousand|million|billion)?\s+followers?)\s*,/i', $description, $match)) {
            $result = $this->parseAudienceCount($match[1], 'follower');
        }
        if ($result === null || ! in_array($url['host'] ?? '', ['instagram.com', 'www.instagram.com'], true)
            || strcasecmp(trim($url['path'] ?? '', '/'), $identifier) !== 0) {
            throw $this->unavailable('instagram');
        }

        return ['displayName' => $identifier, ...$result];
    }

    public function parseTwitterPage(string $html, string $identifier): array
    {
        foreach ($this->xpath($html)->query('//a[@href]') as $anchor) {
            $href = strtolower($anchor->getAttribute('href'));
            if (! in_array($href, ['/'.strtolower($identifier).'/followers', '/'.strtolower($identifier).'/verified_followers'], true)) {
                continue;
            }
            $text = preg_replace('/\s+/u', ' ', trim(preg_replace('/<[^>]*>/', ' ', $anchor->ownerDocument->saveHTML($anchor))));
            $result = $this->parseAudienceCount(html_entity_decode($text, ENT_QUOTES | ENT_HTML5), 'follower');
            if ($result !== null) {
                return ['displayName' => $identifier, ...$result];
            }
        }
        throw $this->unavailable('twitter');
    }

    private function unavailable(string $platform): UnexpectedValueException
    {
        return new UnexpectedValueException(self::LABELS[$platform]."'s public page did not expose a readable count. It may require sign-in or have changed.");
    }

    private function xpath(string $html): DOMXPath
    {
        $previous = libxml_use_internal_errors(true);
        try {
            $document = new DOMDocument;
            $document->loadHTML('<?xml encoding="UTF-8">'.($html ?: '<html></html>'), LIBXML_NONET);

            return new DOMXPath($document);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }

    private function youtubeInitialData(string $html): array
    {
        preg_match_all('/(?:var\s+ytInitialData|window\s*\[\s*["\']ytInitialData["\']\s*\]|ytInitialData)\s*=\s*/', $html, $matches, PREG_OFFSET_CAPTURE);
        foreach ($matches[0] as [$assignment, $offset]) {
            $start = $offset + strlen($assignment);
            if (($html[$start] ?? '') !== '{') {
                continue;
            }
            $depth = 0;
            $quoted = false;
            $escaped = false;
            for ($index = $start, $length = strlen($html); $index < $length; $index++) {
                $char = $html[$index];
                if ($quoted) {
                    if ($escaped) {
                        $escaped = false;
                    } elseif ($char === '\\') {
                        $escaped = true;
                    } elseif ($char === '"') {
                        $quoted = false;
                    }
                } elseif ($char === '"') {
                    $quoted = true;
                } elseif ($char === '{') {
                    $depth++;
                } elseif ($char === '}' && --$depth === 0) {
                    $decoded = json_decode(substr($html, $start, $index - $start + 1), true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                    break;
                }
            }
        }

        return [];
    }
}
