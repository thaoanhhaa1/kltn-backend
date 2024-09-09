class CustomError extends Error {
    private _statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this._statusCode = statusCode;
    }

    get statusCode() {
        return this._statusCode;
    }

    set statusCode(value) {
        this._statusCode = value;
    }
}

export class EntryError extends CustomError {
    private _details: Array<{ field: string; error: string }>;

    constructor(statusCode: number, message: string, details: Array<{ field: string; error: string }>) {
        super(statusCode, message);
        this._details = details;
    }

    get details() {
        return this._details;
    }

    set details(value) {
        this._details = value;
    }
}

export default CustomError;
