<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use MongoDB\Laravel\Eloquent\Casts\ObjectId;
use MongoDB\Laravel\Eloquent\Model;

class Link extends Model
{
    use HasFactory;

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    public const PLATFORMS = ['youtube', 'tiktok', 'twitter', 'instagram', 'facebook', 'threads', 'reddit', 'linkedin', 'twitch', 'pinterest', 'other'];

    protected $connection = 'mongodb';

    protected $fillable = ['project', 'campaign', 'title', 'platform', 'slug', 'destinationUrl', 'customUrl', 'isActive', 'clickCount'];

    protected $attributes = ['isActive' => true, 'clickCount' => 0];

    protected function casts(): array
    {
        return [
            'project' => ObjectId::class,
            'campaign' => ObjectId::class,
            'isActive' => 'boolean',
            'clickCount' => 'integer',
        ];
    }
}
