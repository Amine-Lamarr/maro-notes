import dotenv from 'dotenv';
dotenv.config();

fetch('https://stuszciqiavgjmclvdeq.supabase.co/storage/v1/object/public/modules/thumbnails/1777555730587_open-book.png')
  .then(res => res.text().then(text => console.log('STATUS:', res.status, 'BODY:', text.slice(0, 200))))
  .catch(err => console.error(err));
