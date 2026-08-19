(function(){
  // countdown to сбор гостей
  var target=new Date('2026-08-22T15:00:00+05:00'), el=document.getElementById('count');
  function plural(n,f){var m=n%100,k=n%10;
    return f[(m>10&&m<20)||k>4||k===0?2:(k===1?0:1)];}
  function tick(){
    var d=target-new Date();
    if(d<=0){el.hidden=true;return;}
    var dd=Math.floor(d/864e5), hh=Math.floor(d/36e5)%24, mm=Math.floor(d/6e4)%60;
    el.innerHTML='<div><b>'+dd+'</b><span>'+plural(dd,['день','дня','дней'])+'</span></div>'+
      '<div><b>'+hh+'</b><span>'+plural(hh,['час','часа','часов'])+'</span></div>'+
      '<div><b>'+mm+'</b><span>'+plural(mm,['минута','минуты','минут'])+'</span></div>';
    el.hidden=false;
  }
  if(el){ tick(); setInterval(tick,30000); }

  // scroll progress
  var prog=document.getElementById('prog');
  function onScroll(){
    var h=document.documentElement;
    var p=h.scrollTop/((h.scrollHeight-h.clientHeight)||1);
    prog.style.width=Math.min(100,p*100)+'%';
    var links=[].slice.call(document.querySelectorAll('.nav a')).filter(function(a){
      return (a.getAttribute('href')||'').charAt(0)==='#';
    }), cur=null;
    if(!links.length) return;
    links.forEach(function(a){
      var t=document.querySelector(a.getAttribute('href'));
      if(t && t.getBoundingClientRect().top<=90) cur=a;
    });
    links.forEach(function(a){a.classList.toggle('act', a===cur);});
  }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // food filters
  var filt=document.getElementById('filt');
  if(filt){
    filt.addEventListener('click', function(e){
      var b=e.target.closest('button'); if(!b) return;
      var f=b.dataset.f;
      [].forEach.call(filt.children, function(x){x.classList.toggle('act', x===b);});
      [].forEach.call(document.querySelectorAll('#eda .card[data-t]'), function(c){
        c.hidden = f!=='all' && c.dataset.t.split(' ').indexOf(f)<0;
      });
    });
  }

  // tap address to copy
  [].forEach.call(document.querySelectorAll('.card .meta'), function(m){
    var first=m.firstChild;
    if(!first || first.nodeType!==3 || !first.nodeValue.trim()) return;
    var txt=first.nodeValue.trim();
    var b=document.createElement('button');
    b.className='copy'; b.type='button'; b.textContent=txt;
    b.title='Скопировать адрес';
    b.addEventListener('click', function(){
      var done=function(){
        var t=document.createElement('span'); t.className='copied'; t.textContent='скопировано';
        b.after(t); setTimeout(function(){t.remove();},1600);
      };
      if(navigator.clipboard) navigator.clipboard.writeText('Челябинск, '+txt).then(done, function(){});
      else done();
    });
    m.replaceChild(b, first);
  });

  // staggered reveal
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window){
    var cards=[].slice.call(document.querySelectorAll('.card'));
    cards.forEach(function(c){c.classList.add('rv');});
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e,i){
        if(e.isIntersecting){
          var n=i; setTimeout(function(){e.target.classList.add('in');}, n*70);
          io.unobserve(e.target);
        }
      });
    },{rootMargin:'0px 0px -8% 0px'});
    cards.forEach(function(c){io.observe(c);});
  }
})();
(function(){
  var WED='2026-08-22';
  var days=document.getElementById('wxDays'), note=document.getElementById('wxNote');
  if(!days || !note) return;
  var DOW=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  function icon(c){
    if(c===0)return'☀️'; if(c<=2)return'🌤'; if(c===3)return'☁️';
    if(c>=45&&c<=48)return'🌫'; if(c>=71&&c<=77)return'🌨';
    if(c>=95)return'⛈'; if(c>=51)return'🌧'; return'☁️';
  }
  function fail(){
    document.getElementById('wx').innerHTML=
      '<p class="wx-h">Погода</p><p class="wx-note">Прогноз не загрузился — '+
      '<a href="https://yandex.ru/pogoda/chelyabinsk">посмотреть на Яндекс.Погоде</a></p>';
  }
  fetch('https://api.open-meteo.com/v1/forecast?latitude=55.1644&longitude=61.4368'+
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'+
        '&timezone=Asia/Yekaterinburg&forecast_days=7')
  .then(function(r){ if(!r.ok) throw 0; return r.json(); })
  .then(function(d){
    var t=d.daily.time, i0=t.indexOf(WED), html='';
    var start = i0>=0 ? Math.max(0, Math.min(i0-2, t.length-5)) : 0;
    for(var i=start; i<Math.min(start+5, t.length); i++){
      var dt=new Date(t[i]+'T12:00:00'), on = t[i]===WED;
      var rain=d.daily.precipitation_probability_max[i];
      html+='<div class="wx-d'+(on?' on':'')+'">'+
        '<div class="wx-dow">'+DOW[dt.getDay()]+' '+dt.getDate()+'</div>'+
        '<div class="wx-ic">'+icon(d.daily.weather_code[i])+'</div>'+
        '<div class="wx-t">'+Math.round(d.daily.temperature_2m_max[i])+'°'+
          '<small> / '+Math.round(d.daily.temperature_2m_min[i])+'°</small></div>'+
        '<div class="wx-rain">'+(rain>=30?rain+'%':'')+'</div></div>';
    }
    days.innerHTML=html;
    if(i0>=0){
      var r=d.daily.precipitation_probability_max[i0];
      var lo=Math.round(d.daily.temperature_2m_min[i0]);
      note.textContent='22 августа днём около '+Math.round(d.daily.temperature_2m_max[i0])+
        '°, к ночи до '+lo+'°'+(r>=40?'. Дождь вероятен — вероятность '+r+'%':'')+'.';
    } else {
      note.remove();
    }
  }).catch(fail);
})();