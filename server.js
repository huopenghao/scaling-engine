require('dotenv').config();
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

const NASA_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const PORT = 3000;

//单段翻译，单段最大450字符
function translateSegment(text){
    return new Promise((resolve)=>{
        if(!text) return resolve("");
        const encodeText = encodeURIComponent(text);
        const reqUrl = `https://api.mymemory.translated.net/get?q=${encodeText}&langpair=en|zh-CN`;

        const timer = setTimeout(()=>{
            resolve(text);
        },3000);

        https.get(reqUrl,(res)=>{
            let buf = '';
            res.on('data',d=>buf+=d);
            res.on('end',()=>{
                clearTimeout(timer);
                try{
                    const j = JSON.parse(buf);
                    const result = j?.responseData?.translatedText || text;
                    resolve(result);
                }catch(e){
                    resolve(text);
                }
            })
        }).on('error',()=>{
            clearTimeout(timer);
            resolve(text);
        })
    })
}

//长文本拆分多段翻译，串行请求，防止被接口限流封掉
async function translateLongText(fullText){
    if(!fullText) return "";
    const SEG_LEN = 450;
    const segments = [];
    for(let i=0;i<fullText.length;i+=SEG_LEN){
        segments.push(fullText.slice(i,i+SEG_LEN));
    }
    let result = "";
    for(const seg of segments){
        const part = await translateSegment(seg);
        result += part;
    }
    return result;
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const parseUrl = url.parse(req.url, true);

    //代理NASA APOD接口
    if(parseUrl.pathname === '/apod'){
        const date = parseUrl.query.date || '';
        let apiUrl;
        if(date){
            apiUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}&date=${date}`;
        }else{
            apiUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`;
        }

        https.get(apiUrl,async (nasaRes)=>{
            let raw = '';
            nasaRes.on('data',chunk=>raw+=chunk);
            nasaRes.on('end',async ()=>{
                try{
                    const data = JSON.parse(raw);
                    if(data.explanation){
                        data.explanation_zh = await translateLongText(data.explanation);
                    }else{
                        data.explanation_zh = "";
                    }
                    res.writeHead(200,{'Content-Type':'application/json;charset=utf-8'});
                    res.end(JSON.stringify(data));
                }catch(err){
                    res.writeHead(500,{'Content-Type':'application/json'});
                    res.end(JSON.stringify({error:"代理请求nasa失败"}));
                }
            })
        }).on('error',()=>{
            res.writeHead(500,{'Content-Type':'application/json'});
            res.end(JSON.stringify({error:"代理请求nasa失败"}));
        })
        return;
    }

    //返回前端页面
    if(req.url === '/' || req.url === '/xjxc.html'){
        fs.readFile('./xjxc.html','utf8',(err,html)=>{
            if(err){
                res.writeHead(404);
                res.end("html文件找不到");
            }else{
                res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
                res.end(html);
            }
        })
        return;
    }

    //加载css
    if(req.url === '/xjxc.css'){
        fs.readFile('./xjxc.css','utf8',(err,css)=>{
            if(err){
                res.writeHead(404);
                res.end("css找不到");
            }else{
                res.writeHead(200,{'Content-Type':'text/css;charset=utf-8'});
                res.end(css);
            }
        })
        return;
    }

    //加载js
    if(req.url === '/xjxc.js'){
        fs.readFile('./xjxc.js','utf8',(err,jscode)=>{
            if(err){
                res.writeHead(404);
                res.end("js找不到");
            }else{
                res.writeHead(200,{'Content-Type':'application/javascript;charset=utf-8'});
                res.end(jscode);
            }
        })
        return;
    }

    res.writeHead(404);
    res.end("404 Not Found");
})

server.listen(PORT,()=>{
    console.log(`代理服务启动成功，浏览器打开：http://127.0.0.1:${PORT}`);
})
