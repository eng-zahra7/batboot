(function () {
  'use strict';
  function set(id, value) { var n=document.getElementById(id); if(n) n.textContent=String(value); }
  function load(){ fetch('php/me.php',{credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json','X-Requested-With':'fetch'}})
    .then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok) throw new Error(d.message||'تعذر تحميل التقدم'); return d;});})
    .then(function(d){
      var p=d.progress||{}, st=d.statistics||{}, rows=d.lessonProgress||[];
      set('total-stars',st.totalStars||0); set('level-number',p.currentLevel||1);
      set('level-xp',p.levelXp||0); set('level-xp-max',p.levelXpMax||15);
      var bar=document.getElementById('level-progress'); if(bar){bar.max=p.levelXpMax||15;bar.value=p.levelXp||0;}
      var percent=st.completedUnits?Math.round(st.completedUnits/(st.completedUnits+Math.max(0,(st.attempts||0)-(st.correctAnswers||0)))*100):0;
      // الشارات مشتقة من البيانات المحفوظة، وليست من localStorage.
      var subject=st.bySubject||{};
      var nums=subject.numbers?subject.numbers.completedUnits:0;
      var add=subject.addition?subject.addition.completedUnits:0;
      var sub=subject.subtraction?subject.subtraction.completedUnits:0;
      function completedMathLevels(code){
        var groups={};
        rows.filter(function(r){return r.subject_code===code&&r.is_completed==1;}).forEach(function(r){
          groups[r.lesson_code]=groups[r.lesson_code]||[];
          groups[r.lesson_code].push(String(r.unit_key));
        });
        return Object.keys(groups).filter(function(k){
          return groups[k].filter(function(v){return v.indexOf('question-')===0;}).length>=3 ||
                 groups[k].some(function(v){return v.indexOf('level-')===0;});
        }).length;
      }
      var addLevels=completedMathLevels('addition'), subLevels=completedMathLevels('subtraction');
      var earned={
        'first-step':(st.completedUnits||0)>=1,
        'star-collector':(st.totalStars||0)>=30,
        'active-learner':(addLevels+subLevels)>=5,
        'number-lover':nums>=10,
        'addition-hero':addLevels>=5,
        'subtraction-hero':subLevels>=5,
        'master-learner':(nums>=10&&addLevels>=5&&subLevels>=5),
        'math-star':(add+sub)>=1,
        'first-lesson':(st.completedUnits||0)>=1,
        'arabic':rows.some(function(x){return String(x.subject_code).indexOf('arabic-')===0;}),
        'english':rows.some(function(x){return String(x.subject_code).indexOf('english-')===0;}),
        'math':(add+sub)>0,
        'all-rounder':(nums>0&&add>0&&sub>0)
      };
      document.querySelectorAll('[data-badge-id]').forEach(function(n){
        var id=n.getAttribute('data-badge-id'); if(Object.prototype.hasOwnProperty.call(earned,id)){
          var yes=earned[id]; n.classList.toggle('is-earned',yes); n.dataset.earned=String(yes);
          var lock=n.querySelector('.is-locked'); if(lock&&yes) lock.classList.remove('is-locked');
        }
      });
      set('total-stars',st.totalStars||0);
      var count=document.querySelector('[data-progress-total]'); if(count) count.textContent=String(st.completedUnits||0);
      document.documentElement.dataset.progressLoaded='true';
    }).catch(function(e){console.error('[Batboot] database progress unavailable:',e);}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load); else load();
})();
