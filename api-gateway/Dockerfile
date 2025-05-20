# Sử dụng hình ảnh Node.js chính thức làm cơ sở
FROM node:18-alpine

# Tạo thư mục làm việc trong container
# WORKDIR /usr/src/app

# Sao chép package.json và package-lock.json (hoặc yarn.lock) vào container
COPY package*.json ./
# Nếu bạn dùng yarn, hãy dùng lệnh sau
# COPY yarn.lock ./

# Cài đặt các phụ thuộc
RUN npm install
# Nếu bạn dùng yarn, hãy dùng lệnh sau
# RUN yarn install

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Biên dịch TypeScript sang JavaScript
RUN npm run build
# Nếu bạn dùng yarn, hãy dùng lệnh sau
# RUN yarn build

# Mở cổng mà ứng dụng sẽ chạy
EXPOSE 4000

# Chạy ứng dụng
CMD ["npm", "start"]
# Nếu bạn dùng yarn, hãy dùng lệnh sau
# CMD ["yarn", "start"]
