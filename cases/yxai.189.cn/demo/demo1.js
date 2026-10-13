import { getUrl, getCaptcha } from './utils.js';
async function main() {
    // const url = await getUrl();
    // console.log(url);
    const captcha = await getCaptcha(true);
    // console.log(captcha);
}
main();
