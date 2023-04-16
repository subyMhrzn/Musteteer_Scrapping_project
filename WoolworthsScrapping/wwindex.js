const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const { Cluster } = require('puppeteer-cluster');

// Add stealth plugin and use defaults 
const pluginStealth = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');


// Use stealth 
puppeteer.use(pluginStealth());
//cluster.use(pluginStealth());
const array = [];
const urls = [
    "https://www.woolworths.com.au/shop/browse/fruit-veg",
    "https://www.woolworths.com.au/shop/browse/meat-seafood-deli",
    "https://www.woolworths.com.au/shop/browse/bakery",
    "https://www.woolworths.com.au/shop/browse/dairy-eggs-fridge",
    "https://www.woolworths.com.au/shop/browse/health-wellness",
    "https://www.woolworths.com.au/shop/browse/lunch-box",
    "https://www.woolworths.com.au/shop/browse/snacks-confectionery",
    "https://www.woolworths.com.au/shop/browse/freezer",
    "https://www.woolworths.com.au/shop/browse/drinks",
    "https://www.woolworths.com.au/shop/browse/liquor",
    "https://www.woolworths.com.au/shop/browse/baby",
    "https://www.woolworths.com.au/shop/browse/beauty-personal-care",
    "https://www.woolworths.com.au/shop/browse/household",
    "https://www.woolworths.com.au/shop/browse/pet",
    "https://www.woolworths.com.au/shop/browse/pantry",
   
];

//Launch pupputeer-stealth 
Cluster.launch({
    

    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 1,
    retryLimit: 2,
    timeout: 4200000,
    // workerCreationDelay: 1000,
    puppeteerOptions: {
        headless: false,
        defaultViewport: false,
        executablePath: executablePath(),
        //setDefaultTimeout: 60000,
        userDataDir : "./tmp",
        timeout:6000000,
        args: ['--start-maximized']
        // waitUntil: load,
    }
}).then(async cluster => {
   
    cluster.on("taskerror", (err, data) => {
        console.log(`Error Crawling ${data}: ${err.message}`)
    });

    await cluster.task(async ({ page, data: url }) => {
        await page.goto(url, {
            
            // setDefaultNavigationTimeout: 60000,
            //  waitUntil : "load",
             waitUntil : 'load',
             timeout: 600000
        });

        // async function waitForSelectorWithReload(page, selector, options){
        //     try{
        //         await page.waitForSelector(selector, options);
        //     }catch (err){
        //         console.log(`Selector "${selector}" from ${page.url()} not found. Reloading page and trying again...`);
        //         await page.reload({ waitUntil: 'domcontentloaded' });
        //         await waitForSelectorWithReload(page,selector, options);
        //     }
            
        // }

        // async function waitForNavigationWithReload(page, options){
        //     try {
        //         await page.waitForNavigation(options);
        //     } catch (err) {
        //         console.log ('cant navigate, reloading page....');
        //         await page.reload({waitUntil: 'domcontentloaded'});
        //         await waitForNavigationWithReload(page, options)
        //     }
        // }

        let isBtn = true;
       
        while (isBtn) {
            
           // await waitForSelectorWithReload(page, '.product-tile-v2', { timeout: 35000, visible: true });
            await page.waitForSelector('.product-tile-v2');    
            const productHandles = await page.$$('.product-tile-v2');


            for (const productHandle of productHandles) {
                let price = "Null"; let title = 'Null'; let image = "Null";
                try {
                    title = await page.evaluate(
                        el => el.querySelector('.product-title-link').textContent, productHandle);
                } catch (error) { }
                try {
                    price = await page.evaluate(
                        el => el.querySelector('div.primary').textContent, productHandle);
                } catch (error) { }
                try {
                    image = await page.evaluate(
                        el => el.querySelector('.product-tile-v2--image > a > img').getAttribute('src'), productHandle);
                } catch (error) { }

                array.push({
                    itemTitle: title,
                    itemPrice: price,
                    itemImage: image,
                });
            }


        
            await page.waitForSelector("div.paging-section", {visible: true});
            const is_button = await page.evaluate(() => document.querySelector('a.paging-next') !== null);
            isBtn = is_button;
            if (is_button) {
                //console.log('exist');
            const linkHref = await page.$eval('a.paging-next', link => link.getAttribute('href'));
            console.log(linkHref);
            // if(linkHref !== '/shop/browse/pantry?pageNumber=222' !! linkHref !== '/shop/browse/beauty-personal-care?pageNumber=222' || linkHref !== '/shop/browse/household?pageNumber=221'){
                await Promise.all([
                    //await page.waitForSelector(".paging-next", { visible: true }),
                    await page.goto(`https://www.woolworths.com.au${linkHref}`,{waitUntil:'load', timeout: 600000}),
                  //  await page.waitForNetworkIdle()
                ]);
            // }

            }

        }
 
    });

    for (const url of urls) {
        await cluster.queue(url);
    }

    await cluster.idle();
    await cluster.close();

    // console.log(array)
    fs.writeFileSync('wwscrapedData.json', JSON.stringify(array), "utf-8", (err) => {
        if (err) throw err;
    });
    console.log('Success!!, scrpaed data has been saved to JSON file');
   
});