<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use MongoDB\Laravel\Eloquent\Casts\ObjectId;
use MongoDB\Laravel\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    protected $connection = 'mongodb';

    protected $fillable = ['owner', 'clientName', 'description'];

    protected function casts(): array
    {
        return [
            'owner' => ObjectId::class,
        ];
    }
}
