console.log("js已加载");

const cardBoxDom = document.querySelector('#cardBox');
const dateInputDom = document.querySelector('#dateInput');
const searchBtnDom = document.querySelector('#searchBtn');
const randomBtnDom = document.querySelector('#randomBtn');
const langBtnDom = document.querySelector('#langBtn');
const showCollectBtnDom = document.querySelector('#showCollectBtn');
const modalDom = document.querySelector('#modal');
const modalImgDom = document.querySelector('#modalImg');
const collectModalDom = document.querySelector('#collectModal');
const collectListDom = document.querySelector('#collectList');
const closeArr = document.querySelectorAll('.close');

const EARLIEST = "1995-06-16";
let currentLang = "zh"; // zh中文 en英文
let currentApodData = null;

//渲染卡片
function renderCard(item){
    currentApodData = JSON.parse(JSON.stringify(item));
    cardBoxDom.innerHTML = "";
    let descText;
    if(currentLang === "zh"){
        descText = item.explanation_zh || item.explanation;
        //译文和原文一模一样 = 翻译接口失败
        if(item.explanation_zh === item.explanation){
            console.warn("翻译接口未返回中文，展示原始英文");
        }
    }else{
        descText = item.explanation;
    }

    const htmlStr = `
    <div class="card">
        <img src="${item.url}" alt="${item.title}">
        <div class="card-content">
            <h2>${item.title}</h2>
            <div class="date">📅 ${item.date}</div>
            <div class="desc">${descText}</div>
            <button class="collect-btn">⭐收藏这张</button>
        </div>
    </div>
    `;
    cardBoxDom.innerHTML = htmlStr;

    const img = cardBoxDom.querySelector('img');
    img.addEventListener('click',()=>{
        modalImgDom.src = item.url;
        modalDom.style.display = "flex";
    })

    const collectBtn = cardBoxDom.querySelector('.collect-btn');
    collectBtn.addEventListener('click',()=>{
        saveCollect(item);
        alert("已加入收藏");
    })
}

//切换语言
function toggleLanguage(){
    if(currentLang === "zh"){
        currentLang = "en";
        langBtnDom.innerText = "语言：English";
    }else{
        currentLang = "zh";
        langBtnDom.innerText = "语言：中文";
    }
    if(currentApodData){
        renderCard(currentApodData);
    }
}

//本地存储收藏
function saveCollect(item){
    let list = JSON.parse(localStorage.getItem('spaceCollect') || '[]');
    const exist = list.some(i=>i.date === item.date);
    if(!exist){
        list.push(item);
        localStorage.setItem('spaceCollect',JSON.stringify(list));
    }
}

//渲染收藏弹窗
function renderCollectModal(){
    const list = JSON.parse(localStorage.getItem('spaceCollect') || '[]');
    collectListDom.innerHTML = "";
    if(list.length === 0){
        collectListDom.innerHTML = "<p>暂无收藏</p>";
        return;
    }
    list.forEach((item,idx)=>{
        let desc = currentLang==="zh" ? (item.explanation_zh||item.explanation) : item.explanation;
        const div = document.createElement('div');
        div.innerHTML = `
        <div style="background:#222;padding:10px;border-radius:6px;margin:4px 0;">
            <div>${item.title} ${item.date}</div>
            <img src="${item.url}" style="height:100px;">
            <div style="font-size:12px;margin:4px 0;max-height:120px;overflow:auto;">${desc}</div>
            <button data-idx="${idx}" class="del-collect">删除收藏</button>
        </div>
        `
        collectListDom.appendChild(div);
    })
    document.querySelectorAll('.del-collect').forEach(btn=>{
        btn.addEventListener('click',(e)=>{
            const i = Number(e.target.dataset.idx);
            let arr = JSON.parse(localStorage.getItem('spaceCollect') || '[]');
            arr.splice(i,1);
            localStorage.setItem('spaceCollect',JSON.stringify(arr));
            renderCollectModal();
        })
    })
    collectModalDom.style.display = "block";
}

//生成随机日期
function getRandomDate(){
    const start = new Date(EARLIEST).getTime();
    const end = Date.now();
    const randomTime = start + Math.random()*(end-start);
    const d = new Date(randomTime);
    const year = d.getFullYear();
    const month = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
}

//请求本地代理接口
async function fetchApod(date){
    try{
        let url;
        if(date){
            url = `/apod?date=${date}`;
        }else{
            url = `/apod`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if(data.error){
            alert("代理获取数据失败");
            return;
        }
        renderCard(data);
    }catch(err){
        console.error(err);
        alert("本地代理服务未启动，请运行 node server.js");
    }
}

//查询按钮
searchBtnDom.addEventListener('click',()=>{
    const val = dateInputDom.value.trim();
    if(!val){
        alert("请选择日期");
        return;
    }
    const selectTime = new Date(val);
    const now = new Date();
    const minTime = new Date(EARLIEST);
    if(selectTime > now){
        alert("不能选择未来日期");
        return;
    }
    if(selectTime < minTime){
        alert("日期不能早于1995-06-16");
        return;
    }
    fetchApod(val);
})

//随机按钮
randomBtnDom.addEventListener('click',()=>{
    const rd = getRandomDate();
    fetchApod(rd);
})

//语言切换按钮
langBtnDom.addEventListener('click',toggleLanguage);

//我的收藏
showCollectBtnDom.addEventListener('click',()=>{
    renderCollectModal();
})

//关闭弹窗
closeArr.forEach(el=>{
    el.addEventListener('click',()=>{
        modalDom.style.display = "none";
        collectModalDom.style.display = "none";
    })
})

window.onload = function(){
    console.log("页面载入完成");
    fetchApod();
}
