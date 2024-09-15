const type0 = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

const type1 = ['', 'mươi', 'trăm'];

const type2 = ['', 'nghìn', 'triệu', 'tỷ'];

export const currencyFormatter = (amount: number) => {
    if (amount === 0) return 'Không đồng';

    let value: string = amount.toString();
    let result = '';
    const str = [];
    for (let i = value.length - 1; i > -1; i -= 3) {
        let tmp = value[i];
        if (value[i - 1]) tmp = value[i - 1] + tmp;
        if (value[i - 2]) tmp = value[i - 2] + tmp;
        str.push(tmp);
    }
    str.forEach((v, index) => {
        if (index > type2.length) return 'The number is too big';
        if (parseInt(v, 10) === 0) return;
        let count = 0;
        for (let i = v.length - 1; i > -1; i--) {
            if (i === v.length - 1) result = type2[index] + ' ' + result;
            if (v[i] !== '0') result = type0[parseInt(v[i], 10)] + ' ' + type1[count] + ' ' + result;
            count++;
        }
    });

    result = result.replaceAll('mươi năm', 'mươi lăm');
    result = result.replaceAll('mươi một', 'mươi mốt');
    result = result.replaceAll('một mươi', 'mười');

    if (parseInt(str[0], 10) === 0) return result + ' đồng';
    return result + ' đồng';
};
