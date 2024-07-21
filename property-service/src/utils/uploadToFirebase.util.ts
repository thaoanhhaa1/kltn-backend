import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { app } from '../configs/firebase.config';

const storage = getStorage(app);

export const upload = ({ file, folder = 'general' }: { file: Express.Multer.File; folder?: string }) => {
    const fileName = `${Date.now()}-${file.originalname.split('.')[0]}.${file.mimetype.split('/')[1]}`;
    const contentType = file.mimetype;
    const metadata = {
        contentType,
    };

    const storageRef = ref(storage, folder + '/' + fileName);
    const uploadTask = uploadBytesResumable(storageRef, file.buffer, metadata);

    return new Promise((res, rej) => {
        uploadTask.on(
            'state_changed',
            () => {},
            rej,
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then(res);
            },
        );
    });
};
