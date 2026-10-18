<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Services\Analytics\ClickExport;
use App\Services\Analytics\ProjectAccess;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams a project's clicks as a JSON or CSV download (`?format=json|csv`, default json,
 * optional `?linkId=`). `ip`, `visitorId` and `visitorVersion` are never exported.
 */
class ClickExportController extends ProjectScopedController
{
    public const INVALID_FORMAT_MESSAGE = 'Format must be json or csv';

    public function __invoke(Request $request, string $projectId, ClickExport $export): StreamedResponse
    {
        $match = $this->clickScope($request, $projectId);
        $query = $request->query->all();
        $format = array_key_exists('format', $query) ? $query['format'] : 'json';

        if (! in_array($format, ClickExport::FORMATS, true)) {
            throw ProjectAccess::failure(400, self::INVALID_FORMAT_MESSAGE);
        }

        return $export->download($match, $format, $projectId);
    }
}
