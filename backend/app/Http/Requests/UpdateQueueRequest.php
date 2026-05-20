<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateQueueRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required_without:paused', Rule::in(['active', 'paused'])],
            'paused' => ['required_without:status', 'boolean'],
        ];
    }
}
