import nodemailer from 'nodemailer';
import Email from 'email-templates';
import path from 'path';
import envConfig from './env.config';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: envConfig.GMAIL_USER,
        pass: envConfig.GMAIL_PASSWORD,
    },
});

const dirname = __dirname
    .replace('/build/src/configs', '')
    .replace('/build/configs', '')
    .replace('\\build\\configs', '')
    .replace('\\src\\configs', '');

console.log(dirname);

const emailTemplates = async (template: string, receiver: string, subject: string, locals: any) => {
    try {
        const email = new Email({
            message: {
                from: `Admin <${envConfig.GMAIL_USER}>`,
                subject,
            },
            send: true,
            preview: false,
            transport: transporter,
            views: {
                options: {
                    extension: 'ejs',
                },
            },
            juice: true,
            juiceResources: {
                preserveImportant: true,
                webResources: {
                    relativeTo: path.join(dirname, 'templates'),
                },
            },
        });

        await email.send({
            template: path.join(dirname, 'templates', 'emails', template),
            message: { to: receiver },
            locals,
        });
    } catch (error) {
        console.log(error);
    }
};

const sendEmail = async ({
    receiver,
    locals,
    subject,
    template,
}: {
    receiver: string;
    locals: any;
    subject: string;
    template: string;
}) => {
    await emailTemplates(template, receiver, subject, locals);
};

export default sendEmail;
