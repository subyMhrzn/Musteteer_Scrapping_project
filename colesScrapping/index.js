const { Cluster } = require('puppeteer-cluster');
const fs = require('fs');
//const puppeteer= require('puppeteer');

const urls = [
   // "https://www.coles.com.au/browse/easter",
   "https://www.coles.com.au/browse/meat-seafood",
    "https://www.coles.com.au/browse/fruit-vegetables",
    "https://www.coles.com.au/browse/dairy-eggs-fridge",
    "https://www.coles.com.au/browse/bakery",
    "https://www.coles.com.au/browse/deli",
    "https://www.coles.com.au/browse/pantry",
    "https://www.coles.com.au/browse/drinks",
    "https://www.coles.com.au/browse/frozen",
    "https://www.coles.com.au/browse/household",
    "https://www.coles.com.au/browse/health-beauty",
    "https://www.coles.com.au/browse/baby",
    "https://www.coles.com.au/browse/pet",
    "https://www.coles.com.au/browse/liquor",
    "https://www.coles.com.au/browse/bonus-cookware-credits",
    //"https://www.coles.com.au/browse/tobacco",

];
const array =[];

(async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 1,
        retryLimit: 2,
        timeout: 4200000,
        // monitor: true,
        puppeteerOptions: {
            headless: false,
            defaultViewport: false,
            userDataDir: "./tmp",
            timeout:6000000,
            args: ['--start-maximized']
        }
    });
    
    
    cluster.on("taskerror", (err, data) => {
        console.log(`Error crawling ${data}: ${err.message}`);
    });

    await cluster.task(async ({ page, data: url }) => {
        await page.goto(url, {
            waitUntil: "load",
            timeout:600000
           
        });

    


        let isBtnDisabled = false;
        while (!isBtnDisabled) {
            await page.waitForSelector('section[data-testid="product-tile"]');
            const productHandles = await page.$$('.product__header');
            for (const productHandle of productHandles) {
                let title = "Null";
                let price = "Null";
                let image = "Null";
                try {
                    // pass the single handle below
                    title = await page.evaluate(
                        el => el.querySelector('.product__title').textContent, productHandle);
                } catch (error) { }

                try {
                    price = await page.evaluate(
                        el => el.querySelector('.price__value').textContent, productHandle);
                } catch (error) { }

                try {

                    image = await page.evaluate(
                        el => el.querySelector('div> a> span > img').getAttribute('src'), productHandle);
                } catch (error) { }
                if (title !== "Null") {

                    array.push({
                        itemTitle: title,
                        itemPrice: price,
                        itemImage: image
                    });

    
                }



            }
            await page.waitForSelector("button#pagination-button-next", { visible: true });
            const is_disabled = await page.evaluate(() => document.querySelector('button#pagination-button-next[disabled]') !== null);

            isBtnDisabled = is_disabled;
            if (!is_disabled) {
                await Promise.all([
                    await page.click("button#pagination-button-next"),
                    // await waitForNavigationWithReload(page, { waitUntil: "load", timeout: 60000 }),
                    await page.waitForNetworkIdle(),
                ]);
            }


        }
    });

    for (const url of urls) {
        await cluster.queue(url);
    }
    

    await cluster.idle();
    await cluster.close();

    fs.writeFileSync('colesScrapedData.json', JSON.stringify(array), "utf-8", (err) => {
        if (err) throw err;
    });
    console.log('Success!!, scrpaed data has been saved to JSON file');
})();