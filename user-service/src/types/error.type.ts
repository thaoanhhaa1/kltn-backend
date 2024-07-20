type ResponseError = {
    status: number;
    message: string;
    success: boolean;
};

type EntryDetailError = {
    field: string;
    error: string;
};

type EntryError = ResponseError & {
    details: Array<EntryDetailError>;
};

export { EntryDetailError, ResponseError, EntryError };
