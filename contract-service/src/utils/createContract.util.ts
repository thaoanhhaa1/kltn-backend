import { RentalRequest } from '@prisma/client';
import { UserDetail } from '../interfaces/user';
import convertAddress from './convertAddress.util';
import convertDateToString from './convertDateToString.util';
import { currencyFormatter } from './currencyFormatter.util';
import formatCurrency from './formatCurrency.util';
import getDifference from './getDifference.util';

type Property = {
    address: {
        city: string;
        district: string;
        street: string;
        ward: string;
    };
    rentalConditions: {
        type: string;
        value: string;
    }[];
};

type IUserDTO = {
    name: string | null;
};

export const createContract = ({
    city,
    date,
    owner,
    ownerDetail,
    property,
    renter,
    renterDetail,
    rentalRequest,
}: {
    city: string;
    date: Date;
    owner: IUserDTO;
    ownerDetail: UserDetail;
    renter: IUserDTO;
    renterDetail: UserDetail;
    property: Property;
    rentalRequest: RentalRequest;
}) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const floor = property.rentalConditions.find((condition) => condition.type === 'Số tầng');
    const floorNumber = floor?.value.replace(' tầng', '') || '...';

    const area = property.rentalConditions.find((condition) => condition.type === 'Diện tích');
    const areaValue = area?.value.replace(' m2', '') || '...';

    const landArea = property.rentalConditions.find((condition) => condition.type === 'Diện tích quyền sử dụng đất');
    const landAreaValue = landArea?.value.replace(' m2', '') || '...';

    return `<div class="mceNonEditable">
<p style="text-align: center; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;" align="center"><strong><span lang="EN-US" style="color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">CỘNG H&Ograve;A X&Atilde; HỘI CHỦ NGHĨA VIỆT NAM</span></strong></p>
<p style="text-align: center; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;" align="center"><strong style="mso-bidi-font-weight: normal;"><span lang="EN-US" style="font-size: 13.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Độ<u>c lập - Tự do - Hạnh ph</u>&uacute;c</span></strong></p>
<p style="text-align: right; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;" align="right"><em><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">${city}, ng&agrave;y ${day} th&aacute;ng ${month} năm ${year}</span></em></p>
<p style="text-align: center; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;" align="center"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">HỢP ĐỒNG THU&Ecirc; NH&Agrave;</span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><em><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Căn cứ&nbsp;Bộ luật D&acirc;n sự số 91/2015/QH13 ng&agrave;y 24/11/2015;</span></em></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><em><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Căn cứ v&agrave;o&nbsp;Luật Thương mại số 36/2005/QH11 ng&agrave;y 14 th&aacute;ng 06 năm 2005;</span></em></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><em><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Căn cứ v&agrave;o nhu cầu v&agrave; sự thỏa thuận của c&aacute;c b&ecirc;n tham gia Hợp đồng;</span></em></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">H&ocirc;m nay, ng&agrave;y ${day} th&aacute;ng ${month} năm ${year}, c&aacute;c B&ecirc;n gồm:</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">B&Ecirc;N CHO THU&Ecirc; (B&ecirc;n A): </span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">&Ocirc;ng</span></strong><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm; font-weight: normal; mso-bidi-font-weight: bold;">: ${
        owner.name
    }</span></strong></p>
<p style="line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black;">CCCD số: ${
        ownerDetail.cardId
    } Cơ quan cấp: ${ownerDetail.issueLoc} Ng&agrave;y cấp: ${convertDateToString(ownerDetail.issueDate!)}</span></p>
<p style="line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black;">Nơi ĐKTT: ${
        ownerDetail.address?.street
    }, ${ownerDetail.address?.ward}, ${ownerDetail.address?.district}, ${ownerDetail.address?.city}</span></p>
<p style="line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">B&Ecirc;N THU&Ecirc; (B&ecirc;n B) :</span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">&Ocirc;ng</span></strong><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm; font-weight: normal; mso-bidi-font-weight: bold;">: ${
        renter.name
    }</span></strong></p>
<p style="line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black;">CCCD số: ${
        renterDetail.cardId
    } Cơ quan cấp: ${renterDetail.issueLoc} Ng&agrave;y cấp: ${convertDateToString(renterDetail.issueDate!)}</span></p>
<p style="line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black;">Nơi ĐKTT: ${
        renterDetail.address?.street
    }, ${renterDetail.address?.ward}, ${renterDetail.address?.district}, ${renterDetail.address?.city}</span></p>
<p style="line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">B&ecirc;n A v&agrave; B&ecirc;n B sau đ&acirc;y gọi chung l&agrave;&nbsp;<em><strong>&ldquo;Hai B&ecirc;n&rdquo;</strong></em>&nbsp;hoặc&nbsp;<em><strong>&ldquo;C&aacute;c B&ecirc;n&rdquo;</strong></em>.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Sau khi thảo luận, Hai B&ecirc;n thống nhất đi đến k&yacute; kết Hợp đồng thu&ecirc; nh&agrave; (<strong>&ldquo;Hợp Đồng&rdquo;</strong>) với c&aacute;c điều khoản v&agrave; điều kiện dưới đ&acirc;y:</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 1. Nh&agrave; ở v&agrave; c&aacute;c t&agrave;i sản cho thu&ecirc; k&egrave;m theo nh&agrave; ở:</span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">1.1. B&ecirc;n A đồng &yacute; cho B&ecirc;n B thu&ecirc; v&agrave; B&ecirc;n B cũng đồng &yacute; thu&ecirc; quyền sử dụng đất v&agrave; một căn nh&agrave; ${floorNumber} tầng gắn liền với quyền sử dụng đất tại địa chỉ ${convertAddress(
        property.address,
    )} để sử dụng l&agrave;m nơi để ở.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Diện t&iacute;ch quyền sử dụng đất: ${landAreaValue} m2;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Diện t&iacute;ch căn nh&agrave; : ${areaValue} m2;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">1.2. B&ecirc;n A cam kết quyền sử sụng đất v&agrave; căn nh&agrave; gắn liền tr&ecirc;n đất tr&ecirc;n l&agrave; t&agrave;i sản sở hữu hợp ph&aacute;p của B&ecirc;n A. Mọi tranh chấp ph&aacute;t sinh từ t&agrave;i sản cho thu&ecirc; tr&ecirc;n B&ecirc;n A ho&agrave;n to&agrave;n chịu tr&aacute;ch nhiệm trước ph&aacute;p luật.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 2. B&agrave;n giao v&agrave; sử dụng diện t&iacute;ch thu&ecirc;:</span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">2.1. Thời điểm B&ecirc;n A b&agrave;n giao t&agrave;i sản thu&ecirc; v&agrave;o ng&agrave;y ${rentalRequest.rentalStartDate.getDate()} th&aacute;ng ${
        rentalRequest.rentalStartDate.getMonth() + 1
    } năm ${rentalRequest.rentalStartDate.getFullYear()};</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">2.2. B&ecirc;n B được to&agrave;n quyền sử dụng t&agrave;i sản thu&ecirc; kể từ thời điểm được B&ecirc;n A b&agrave;n giao từ thời điểm quy định tại Mục 2.1 tr&ecirc;n đ&acirc;y.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 3. Thời hạn thu&ecirc;</span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">3.1. B&ecirc;n A cam kết cho B&ecirc;n B thu&ecirc; t&agrave;i sản thu&ecirc; với thời hạn ${getDifference(
        rentalRequest.rentalStartDate,
        rentalRequest.rentalEndDate,
    )} kể từ ng&agrave;y b&agrave;n giao T&agrave;i sản thu&ecirc;;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">3.2. Hết thời hạn thu&ecirc; n&ecirc;u tr&ecirc;n nếu b&ecirc;n B c&oacute; nhu cầu tiếp tục sử dụng th&igrave; B&ecirc;n A phải ưu ti&ecirc;n cho B&ecirc;n B tiếp tục thu&ecirc;.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 4. Đặc cọc tiền thu&ecirc; nh&agrave;</span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">4.1. B&ecirc;n B sẽ giao cho B&ecirc;n A một khoản tiền <strong>${formatCurrency(
        rentalRequest.rentalDeposit,
    )}&nbsp;VNĐ&nbsp;</strong><em>(bằng chữ: ${currencyFormatter(
        rentalRequest.rentalDeposit,
    )})&nbsp;</em>ngay sau khi k&yacute; hợp đồng n&agrave;y. Số tiền n&agrave;y l&agrave; tiền đặt cọc để đảm bảm thực hiện Hợp đồng cho thu&ecirc; nh&agrave;. </span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">4.2. Nếu B&ecirc;n B đơn phương chấm dứt hợp đồng m&agrave; kh&ocirc;ng thực hiện nghĩa vụ b&aacute;o trước tới B&ecirc;n A th&igrave; B&ecirc;n A sẽ kh&ocirc;ng phải ho&agrave;n trả lại B&ecirc;n B số tiền đặt cọc n&agrave;y.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Nếu B&ecirc;n A đơn phương chấm dứt hợp đồng m&agrave; kh&ocirc;ng thực hiện nghĩa vụ b&aacute;o trước tới b&ecirc;n B th&igrave; b&ecirc;n A sẽ phải ho&agrave;n trả lại B&ecirc;n B số tiền đặt cọc v&agrave; phải bồi thường th&ecirc;m một khoản bằng ch&iacute;nh một tháng tiền thuê.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">4.3. Tiền đặt cọc của B&ecirc;n B sẽ kh&ocirc;ng được d&ugrave;ng để thanh to&aacute;n tiền thu&ecirc;. Nếu B&ecirc;n B vi phạm Hợp Đồng l&agrave;m ph&aacute;t sinh thiệt hại cho B&ecirc;n A th&igrave; B&ecirc;n A c&oacute; quyền khấu trừ tiền đặt cọc để b&ugrave; đắp c&aacute;c chi ph&iacute; khắc phục thiệt hại ph&aacute;t sinh. Mức chi ph&iacute; b&ugrave; đắp thiệt hại sẽ được C&aacute;c B&ecirc;n thống nhất bằng văn bản.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">4.4. V&agrave;o thời điểm kết th&uacute;c thời hạn thu&ecirc; hoặc kể từ ng&agrave;y chấm dứt Hợp đồng, B&ecirc;n A sẽ ho&agrave;n lại cho B&ecirc;n B số tiền đặt cọc sau khi đ&atilde; khấu trừ khoản tiền chi ph&iacute; để khắc phục thiệt hại (nếu c&oacute;).</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 5. Tiền thu&ecirc; nh&agrave;:</span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">5.1 Tiền thu&ecirc; nh&agrave; đối với diện t&iacute;ch thu&ecirc; n&ecirc;u tại mục 1.1 Điều 1 l&agrave;:<strong>&nbsp;${formatCurrency(
        rentalRequest.rentalPrice,
    )} VNĐ/th&aacute;ng&nbsp;</strong><em>(Bằng chữ: ${currencyFormatter(rentalRequest.rentalPrice)})</em></span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">5.2 Tiền thu&ecirc; nh&agrave; kh&ocirc;ng bao gồm chi ph&iacute; kh&aacute;c như tiền điện, nước, vệ sinh.... Khoản tiền n&agrave;y sẽ do b&ecirc;n B trả theo khối lượng, c&ocirc;ng suất sử dụng thực tế của B&ecirc;n B h&agrave;ng th&aacute;ng, được t&iacute;nh theo đơn gi&aacute; của nh&agrave; nước.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 6. Phương thức thanh to&aacute;n tiền thu&ecirc; nh&agrave;</span></strong></p>
<div class="mceEditable">
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Tiền thu&ecirc; nh&agrave; được thanh to&aacute;n theo 01 (một) th&aacute;ng/lần v&agrave;o ng&agrave;y 05 (năm) h&agrave;ng th&aacute;ng. </span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">C&aacute;c chi ph&iacute; kh&aacute;c được b&ecirc;n B tự thanh to&aacute;n với c&aacute;c cơ quan, đơn vị c&oacute; li&ecirc;n quan khi được y&ecirc;u cầu.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Việc thanh to&aacute;n tiền thu&ecirc; nh&agrave; được thực hiện bằng đồng tiền Việt Nam theo h&igrave;nh thức trả trực tiếp bằng tiền mặt.</span></p>
</div>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 7. Quyền v&agrave; nghĩa vụ của b&ecirc;n cho thu&ecirc; nh&agrave;</span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">7.1. Quyền lợi</span></strong></p>
<div class="mceEditable">
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Y&ecirc;u cầu B&ecirc;n B thanh to&aacute;n tiền thu&ecirc; v&agrave; chi ph&iacute; kh&aacute;c đầy đủ, đ&uacute;ng hạn theo thoả thuận trong Hợp Đồng;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Y&ecirc;u cầu B&ecirc;n B phải sửa chữa phần hư hỏng, thiệt hại do lỗi của B&ecirc;n B g&acirc;y ra.</span></p>
</div>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">7.2. Nghĩa vụ của</span></strong></p>
<div class="mceEditable">
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- B&agrave;n giao diện t&iacute;ch thu&ecirc; cho B&ecirc;n B theo đ&uacute;ng thời gian quy định trong Hợp đồng;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Đảm bảo việc cho thu&ecirc; theo Hợp đồng n&agrave;y l&agrave; đ&uacute;ng quy định của ph&aacute;p luật;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Đảm bảo cho B&ecirc;n B thực hiện quyền sử dụng diện t&iacute;ch thu&ecirc; một c&aacute;ch độc lập v&agrave; li&ecirc;n tục trong suốt thời hạn thu&ecirc;, trừ trường hợp vi phạm ph&aacute;p luật v&agrave;/hoặc c&aacute;c quy định của Hợp đồng n&agrave;y.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Kh&ocirc;ng x&acirc;m phạm tr&aacute;i ph&eacute;p đến t&agrave;i sản của B&ecirc;n B trong phần diện t&iacute;ch thu&ecirc;. Nếu B&ecirc;n A c&oacute; những h&agrave;nh vi vi phạm g&acirc;y thiệt hại cho B&ecirc;n B trong thời gian thu&ecirc; th&igrave; B&ecirc;n A phải bồi thường.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Tu&acirc;n thủ c&aacute;c nghĩa vụ kh&aacute;c theo thoả thuận tại Hợp đồng n&agrave;y hoặc/v&agrave; c&aacute;c văn bản k&egrave;m theo Hợp đồng n&agrave;y; hoặc/v&agrave; theo quy định của ph&aacute;p luật Việt Nam.</span></p>
</div>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 8. Quyền v&agrave; nghĩa vụ của b&ecirc;n thu&ecirc; nh&agrave;</span></strong></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">8.1. Quyền lợi</span></strong></p>
<div class="mceEditable">
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Nhận b&agrave;n giao diện t&iacute;ch thu&ecirc; theo đ&uacute;ng thoả thuận trong Hợp đồng;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Được sử dụng phần diện t&iacute;ch thu&ecirc; l&agrave;m nơi ở v&agrave; c&aacute;c hoạt động hợp ph&aacute;p kh&aacute;c;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Y&ecirc;u cầu B&ecirc;n A sửa chữa kịp thời những hư hỏng kh&ocirc;ng phải do lỗi của B&ecirc;n B trong phần diện t&iacute;ch thu&ecirc; để bảo đảm an to&agrave;n;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Được th&aacute;o dỡ v&agrave; đem ra khỏi phần diện t&iacute;ch thu&ecirc; c&aacute;c t&agrave;i sản, trang thiết bị của B&ecirc;n B đ&atilde; lắp đặt trong phần diện t&iacute;ch thu&ecirc; khi hết thời hạn thu&ecirc; hoặc đơn phương chấm dứt hợp đồng.</span></p>
</div>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">8.2. Nghĩa vụ </span></strong></p>
<div class="mceEditable">
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Sử dụng diện t&iacute;ch thu&ecirc; đ&uacute;ng mục đ&iacute;ch đ&atilde; thỏa thuận, giữ g&igrave;n nh&agrave; ở v&agrave; c&oacute; tr&aacute;ch nhiệm trong việc sửa chữa những hư hỏng do m&igrave;nh g&acirc;y ra;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Thanh to&aacute;n tiền đặt cọc, tiền thu&ecirc; đầy đủ, đ&uacute;ng thời hạn đ&atilde; thỏa thuận;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Trả lại diện t&iacute;ch thu&ecirc; cho B&ecirc;n A khi hết thời hạn thu&ecirc; hoặc chấm dứt Hợp đồng thu&ecirc;;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Mọi việc sửa chữa, cải tạo, lắp đặt bổ sung c&aacute;c trang thiết bị l&agrave;m ảnh hưởng đến kết cấu của căn ph&ograve;ng&hellip;, B&ecirc;n B phải c&oacute; văn bản th&ocirc;ng b&aacute;o cho B&ecirc;n A v&agrave; chỉ được tiến h&agrave;nh c&aacute;c c&ocirc;ng việc n&agrave;y sau khi c&oacute; sự đồng &yacute; bằng văn bản của B&ecirc;n A;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Tu&acirc;n thủ một c&aacute;ch chặt chẽ quy định tại Hợp đồng n&agrave;y v&agrave; c&aacute;c quy định của ph&aacute;p luật Việt Nam.</span></p>
</div>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 9. Đơn phương chấm dứt&nbsp;hợp đồng thu&ecirc; nh&agrave;:</span></strong></p>
<div class="mceEditable">
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Trong trường hợp một trong Hai B&ecirc;n muốn đơn phương chấm dứt Hợp đồng trước hạn th&igrave; phải th&ocirc;ng b&aacute;o bằng văn bản cho b&ecirc;n kia trước 30 (ba mươi) ng&agrave;y so với ng&agrave;y mong muốn chấm dứt. Nếu một trong Hai B&ecirc;n kh&ocirc;ng thực hiện nghĩa vụ th&ocirc;ng b&aacute;o cho B&ecirc;n kia th&igrave; sẽ phải bồi thường cho b&ecirc;n đ&oacute; một khoản tiền thu&ecirc; tương đương với thời gian kh&ocirc;ng th&ocirc;ng b&aacute;o v&agrave; c&aacute;c thiệt hại kh&aacute;c ph&aacute;t sinh do việc chấm dứt Hợp đồng tr&aacute;i quy định.</span></p>
</div>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><strong><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">Điều 10. Điều khoản thi h&agrave;nh</span></strong></p>
<div class="mceEditable">
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Hợp đồng n&agrave;y c&oacute; hiệu lực kể từ ng&agrave;y hai b&ecirc;n c&ugrave;ng k&yacute; kết;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- C&aacute;c B&ecirc;n cam kết thực hiện nghi&ecirc;m chỉnh v&agrave; đầy đủ c&aacute;c thoả thuận trong Hợp đồng n&agrave;y tr&ecirc;n tinh thần hợp t&aacute;c, thiện ch&iacute;;</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Mọi sửa đổi, bổ sung đối với bất kỳ điều khoản n&agrave;o của Hợp đồng phải được lập th&agrave;nh văn bản, c&oacute; đầy đủ chữ k&yacute; của mỗi B&ecirc;n. Văn bản sửa đổi bổ sung Hợp đồng c&oacute; gi&aacute; trị ph&aacute;p l&yacute; như Hợp đồng, l&agrave; một phần kh&ocirc;ng t&aacute;ch rời của Hợp đồng n&agrave;y.</span></p>
<p style="text-align: justify; line-height: 18.75pt; background: white; vertical-align: baseline; margin: 0cm 0cm 6.0pt 0cm;"><span lang="EN-US" style="font-size: 14.0pt; color: black; border: none windowtext 1.0pt; mso-border-alt: none windowtext 0cm; padding: 0cm;">- Hợp đồng được lập th&agrave;nh 02 (hai) bản c&oacute; gi&aacute; trị như nhau, mỗi B&ecirc;n giữ 01 (một) bản để thực hiện.</span></p>
</div>
</div>`;
};
