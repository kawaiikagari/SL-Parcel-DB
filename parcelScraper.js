const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeParcel(parcelName) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto(
    `https://search.secondlife.com/?search_type=standard&collection_chosen=places&maturity=gma&query_term=${encodeURIComponent(parcelName)}`,
    { waitUntil: 'networkidle2' }
  );

  const data = await page.evaluate(() => {
    const block = document.querySelector('.search-result');
    if (!block) return null;
    return {
      owner: block.querySelector('.owner')?.innerText || "",
      region: block.querySelector('.region')?.innerText || "",
      size: block.querySelector('.size')?.innerText || "",
      traffic: block.querySelector('.traffic')?.innerText || "",
      category: block.querySelector('.category')?.innerText || "",
      rating: block.querySelector('.rating')?.innerText || "",
      dgFlag: block.innerText.includes("Destination Guide") ? "Yes" : "No"
    };
  });

  await browser.close();
  return data;
}

(async () => {
  const list = JSON.parse(fs.readFileSync('parcel_list.json'));
  const parcelDir = path.join(__dirname, 'parcels');

  if (!fs.existsSync(parcelDir)) fs.mkdirSync(parcelDir);

  for (const type of ['existing', 'new']) {
    for (const name of list[type]) {
      const data = await scrapeParcel(name);
      if (data) {
        const filePath = path.join(parcelDir, `${name}.json`);
        fs.writeFileSync(filePath, JSON.stringify({ name, ...data }, null, 2));
        console.log(`${name}.json ${type === 'existing' ? '更新' : '新規作成'}完了`);
      } else {
        console.log(`${name} の情報取得に失敗`);
      }
    }
  }
})();
