/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // <<-- Закомментировано: Отключаем статический экспорт

  // Эта опция часто нужна для next/image при статическом экспорте
  // Она отключает оптимизацию изображений на стороне сервера Next.js
  // images: {
  //   unoptimized: true,
  // },

  /* async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*', // Прокси на Go сервер
      },
    ];
  }, */

  // Здесь могут быть другие ваши настройки Next.js
};

module.exports = nextConfig; 