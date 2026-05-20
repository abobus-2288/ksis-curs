<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConsumeMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'consumer_id' => ['required', 'string', 'max:255'],
            'visibility_timeout' => ['sometimes', 'integer', 'min:1', 'max:86400'],
        ];
    }
}
