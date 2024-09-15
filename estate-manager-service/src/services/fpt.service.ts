import envConfig from '../configs/env.config';

export const verifyIDCard = async (file: Express.Multer.File) => {
    const blob = new Blob([file.buffer], { type: file.mimetype });

    const formData = new FormData();

    formData.append('image', blob);

    const res = await fetch(`${envConfig.FPT_ENDPOINT}?api_key=${envConfig.FPT_API_KEY}`, {
        method: 'POST',
        body: formData,
    });
    const data = await res.json();

    return data;
};
