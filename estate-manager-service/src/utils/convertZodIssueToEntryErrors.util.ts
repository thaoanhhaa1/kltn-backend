import { ZodIssue } from 'zod';
import { EntryError } from './error.util';

const convertZodIssueToEntryErrors = ({
    issue,
    message = 'Invalid input',
    status = 400,
}: {
    issue: ZodIssue[];
    message?: string;
    status?: number;
}): EntryError => {
    return new EntryError(
        status,
        message,
        issue.map((error) => ({ field: error.path.join('.'), error: error.message })),
    );
};

export default convertZodIssueToEntryErrors;
