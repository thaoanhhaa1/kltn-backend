import otpGenerator from 'otp-generator';

const otp = {
    generate: () =>
        otpGenerator.generate(6, { lowerCaseAlphabets: false, specialChars: false, upperCaseAlphabets: false }),
};

export default otp;
