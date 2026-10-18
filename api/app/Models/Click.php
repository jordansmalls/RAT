<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use MongoDB\Laravel\Eloquent\Casts\ObjectId;
use MongoDB\Laravel\Eloquent\Model;

class Click extends Model
{
    use HasFactory;

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    protected $connection = 'mongodb';

    protected $fillable = ['link', 'project', 'campaign', 'destinationUrl', 'clickedAt', 'dayOfWeek', 'hourOfDay', 'fullDateClicked', 'ip', 'visitorId', 'visitorVersion', 'geo', 'device', 'os', 'browser', 'referrer', 'isBot'];

    protected $hidden = ['ip', 'visitorId', 'visitorVersion', '__v'];

    protected function casts(): array
    {
        return [
            'link' => ObjectId::class,
            'project' => ObjectId::class,
            'campaign' => ObjectId::class,
            'clickedAt' => 'datetime',
            'isBot' => 'boolean',
        ];
    }
}
