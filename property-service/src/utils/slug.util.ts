import slug from 'slug';

export const options: slug.Options = {
    lower: true,
    symbols: false,
    charmap: slug.charmap,
    multicharmap: slug.multicharmap,
    mode: 'rfc3986',
    replacement: '-',
    locale: 'en',
};
