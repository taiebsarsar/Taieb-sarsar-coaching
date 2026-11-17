(function () {
 var AC = { sedentaire: ['Sédentaire (bureau, peu de marche)', 1.2], leger: ['Légèrement actif', 1.3], actif: ['Actif (souvent debout)', 1.4], tres: ['Très actif (travail physique)', 1.5] };
 var OBJ = { seche: 'Perte de graisse (sèche)', masse: 'Prise de masse musculaire', maintien: 'Maintien du poids' };
 var CATS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation', 'Pré-entraînement', 'Post-entraînement'];
 var ICO = { 'Petit-déjeuner': '🍳', 'Déjeuner': '🍛', 'Dîner': '🥣', 'Collation': '🥜', 'Pré-entraînement': '🍌', 'Post-entraînement': '🥤' };
 var PART = { 'Petit-déjeuner': 0.25, 'Déjeuner': 0.35, 'Dîner': 0.3, 'Collation': 0.1, 'Pré-entraînement': 0.1, 'Post-entraînement': 0.15 };
 var SYN = { lactose: 'lait', laitage: 'lait', laitages: 'lait', ble: 'gluten', noix: 'coque', amande: 'coque', amandes: 'coque', noisette: 'coque', cacahuete: 'arachide', cacahuetes: 'arachide' };
 var R = { ajust_seche: -15, ajust_masse: 10, prot_seche: 2.2, prot_masse: 1.8, prot_maintien: 1.6, lip_pct: 25 };
 var S = { user: null, role: null, nom: '', np: null, poids: [], hist: [], rec: [], onglet: 'profil', cat: '', tous: false, tab: 'adh', clients: [], nps: [], sel: null, edit: null, menu: [], jour: [] };
 var q = function (id) { return document.getElementById(id); };
 var num = function (x) { return Number(String(x).split(' ').join('').replace(',', '.')) || 0; };
 var e = function (t) { return String(t == null ? '' : t).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split(String.fromCharCode(34)).join('&quot;').split(String.fromCharCode(39)).join('&#39;'); };
 var d1 = function (x) { return Math.round(num(x) * 10) / 10; };
 function norm(t) { return String(t || '').toLowerCase().split('œ').join('oe').normalize('NFD').split('').filter(function (c) { var k = c.charCodeAt(0); return k < 768 || k > 879; }).join(''); }
 function liste(t) { return norm(t).split(String.fromCharCode(10)).join(',').split(';').join(',').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }

 function verifier(p) {
  if (p.sexe !== 'homme' && p.sexe !== 'femme') return 'Choisis ton sexe.';
  if (!(p.age >= 10 && p.age <= 90)) return 'Âge entre 10 et 90 ans.';
  if (!(p.poids >= 30 && p.poids <= 300)) return 'Poids entre 30 et 300 kg.';
  if (!(p.taille >= 120 && p.taille <= 230)) return 'Taille entre 120 et 230 cm.';
  if (!AC[p.activite]) return 'Choisis ton niveau d’activité.';
  if (!(p.seances >= 0 && p.seances <= 14)) return 'Séances par semaine entre 0 et 14.';
  if (!OBJ[p.objectif]) return 'Choisis ton objectif.';
  if (!(p.repas >= 1 && p.repas <= 8)) return 'Repas par jour entre 1 et 8.';
  return null;
 }
 function calcul(p, r) {
  var bmr = 10 * p.poids + 6.25 * p.taille - 5 * p.age + (p.sexe === 'homme' ? 5 : -161);
  var tdee = bmr * AC[p.activite][1] + p.seances * 300 / 7;
  var aj = p.objectif === 'seche' ? r.ajust_seche : p.objectif === 'masse' ? r.ajust_masse : 0;
  var kcal = Math.min(4500, Math.max(p.sexe === 'homme' ? 1500 : 1200, tdee * (1 + aj / 100)));
  var gkg = p.objectif === 'seche' ? r.prot_seche : p.objectif === 'masse' ? r.prot_masse : r.prot_maintien;
  var prot = gkg * p.poids, lip = kcal * r.lip_pct / 100 / 9;
  var gluc = (kcal - prot * 4 - lip * 9) / 4;
  if (gluc < 50) { prot = Math.max(1.2 * p.poids, (kcal - lip * 9 - 200) / 4); gluc = (kcal - prot * 4 - lip * 9) / 4; }
  var P = Math.round(prot), L = Math.round(lip), G = Math.max(0, Math.round((kcal - 4 * P - 9 * L) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: 4 * P + 4 * G + 9 * L, prot: P, gluc: G, lip: L };
 }
 function coherent(k, p, g, l) { return Math.abs(k - (4 * p + 4 * g + 9 * l)) <= 0.05 * k; }
 function valeurs(np) {
  if (!np) return null;
  var c = np.kcal_c != null || np.prot_c != null || np.gluc_c != null || np.lip_c != null;
  if (!c && (np.sensible || np.kcal == null)) return null;
  var pick = function (a, b) { return a != null ? num(a) : num(b); };
  return { kcal: pick(np.kcal_c, np.kcal), prot: pick(np.prot_c, np.prot), gluc: pick(np.gluc_c, np.gluc), lip: pick(np.lip_c, np.lip), coach: c };
 }
 function bloque(r, np) {
  var txt = norm(r.allergenes + ' ' + r.ingredients);
  return liste((np.allergies || '') + ',' + (np.interdits || '')).some(function (t) {
   var s = t.length > 3 && t.slice(-1) === 's' ? t.slice(0, -1) : t;
   return [t, s, SYN[t], SYN[s]].some(function (v) { return v && txt.indexOf(v) >= 0; });
  });
 }
 function recettesPour(np, rec, tous) {
  var v = valeurs(np);
  var ok = rec.filter(function (r) { return !bloque(r, np) && r.objectifs.split(',').indexOf(np.objectif) >= 0; });
  var pref = liste(np.preferences);
  var pts = function (r) { var t = norm(r.ingredients + ' ' + r.nom); return pref.filter(function (x) { return t.indexOf(x) >= 0; }).length; };
  if (!tous && v) ok = ok.filter(function (r) { var c = v.kcal * (PART[r.categorie] || 0.25); return r.kcal >= c * 0.5 && r.kcal <= c * 1.5; });
  return ok.sort(function (a, b) { return pts(b) - pts(a); });
 }


 var SL = { 1: ['Déjeuner'], 2: ['Déjeuner', 'Dîner'], 3: ['Petit-déjeuner', 'Déjeuner', 'Dîner'], 4: ['Petit-déjeuner', 'Déjeuner', 'Collation', 'Dîner'], 5: ['Petit-déjeuner', 'Collation', 'Déjeuner', 'Post-entraînement', 'Dîner'], 6: ['Petit-déjeuner', 'Collation', 'Pré-entraînement', 'Déjeuner', 'Post-entraînement', 'Dîner'], 7: ['Petit-déjeuner', 'Collation', 'Pré-entraînement', 'Déjeuner', 'Post-entraînement', 'Collation', 'Dîner'], 8: ['Petit-déjeuner', 'Collation', 'Pré-entraînement', 'Déjeuner', 'Collation', 'Post-entraînement', 'Dîner', 'Collation'] };
 function jc() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
 function lire(k) { try { var x = JSON.parse(localStorage.getItem(k) || 'null'); return x && x.d === jc() && Array.isArray(x.items) ? x.items : []; } catch (z) { return []; } }
 function ecrire(k, items) { try { localStorage.setItem(k, JSON.stringify({ d: jc(), items: items })); } catch (z) { } }
 function chargerMenu() { S.menu = lire('nutmenu_' + S.user.id); S.jour = lire('nutjour_' + S.user.id); }
 function saveMenu() { ecrire('nutmenu_' + S.user.id, S.menu); ecrire('nutjour_' + S.user.id, S.jour); }
 function recById(id) { return S.rec.filter(function (r) { return String(r.id) === String(id); })[0]; }
 function portion(r, cible) { var f = cible / Math.max(1, num(r.kcal)); f = Math.min(1.8, Math.max(0.6, f)); return Math.round(f * 20) / 20; }
 function candidats(np, c) { return recettesPour(np, S.rec, true).filter(function (r) { return r.categorie === c; }); }
 function cibleDe(np, val, c) { var sl = SL[np.repas] || SL[3], t = 0; sl.forEach(function (x) { t += PART[x]; }); return val.kcal * PART[c] / t; }
 function mac(r, f) { return { kcal: num(r.kcal) * f, prot: num(r.prot) * f, gluc: num(r.gluc) * f, lip: num(r.lip) * f }; }
 function somme(L) { return L.reduce(function (t, x) { t.kcal += num(x.kcal); t.prot += num(x.prot); t.gluc += num(x.gluc); t.lip += num(x.lip); return t; }, { kcal: 0, prot: 0, gluc: 0, lip: 0 }); }
 function composer() {
  var np = S.np, val = valeurs(np); if (!np || !val) return;
  var sl = SL[np.repas] || SL[3], pris = {}, out = [];
  sl.forEach(function (c) {
   var cible = cibleDe(np, val, c), cand = candidats(np, c);
   var libres = cand.filter(function (r) { return !pris[r.id]; }); if (libres.length) cand = libres;
   if (!cand.length) { out.push({ c: c, id: null, f: 1 }); return; }
   var tri = cand.map(function (r, i) { return { r: r, s: Math.abs(Math.log(cible / Math.max(1, num(r.kcal)))) + i * 0.01 }; }).sort(function (a, b) { return a.s - b.s; }).slice(0, 3);
   var ch = tri[Math.floor(Math.random() * tri.length)].r;
   pris[ch.id] = 1; out.push({ c: c, id: ch.id, f: portion(ch, cible) });
  });
  S.menu = out; S.jour = S.jour.filter(function (x) { return x.m == null; }); saveMenu(); vue();
 }
 function changer(i) {
  var np = S.np, val = valeurs(np), it = S.menu[i]; if (!it || !val) return;
  var cand = candidats(np, it.c);
  if (cand.length < 2) { alert('Il n’y a pas d’autre recette compatible pour ce repas. Demande à ton coach d’en ajouter.'); return; }
  var k = 0; cand.forEach(function (r, j) { if (String(r.id) === String(it.id)) k = j; });
  var r = cand[(k + 1) % cand.length];
  it.id = r.id; it.f = portion(r, cibleDe(np, val, it.c));
  S.jour = S.jour.filter(function (x) { return x.m !== i; }); saveMenu(); vue();
 }
 function mange(i) {
  var it = S.menu[i], r = it && recById(it.id); if (!r) return;
  var deja = S.jour.some(function (x) { return x.m === i; });
  if (deja) S.jour = S.jour.filter(function (x) { return x.m !== i; });
  else { var m = mac(r, it.f); S.jour.push({ nom: r.nom + ' (x' + it.f + ')', kcal: m.kcal, prot: m.prot, gluc: m.gluc, lip: m.lip, m: i }); }
  saveMenu(); vue();
 }
 function ajoutBib() {
  var r = recById(v('jrec')), f = num(v('jpor')) || 1; if (!r) { alert('Choisis une recette.'); return; }
  var m = mac(r, f); S.jour.push({ nom: r.nom + ' (x' + f + ')', kcal: m.kcal, prot: m.prot, gluc: m.gluc, lip: m.lip }); saveMenu(); vue();
 }
 function ajoutLibre() {
  var nom = v('jnom'), k = num(v('jk')), p = num(v('jp')), g = num(v('jg')), l = num(v('jl'));
  if (!nom) { alert('Écris le nom de l’aliment.'); return; }
  if (!(k > 0 && k <= 3000)) { alert('Calories entre 1 et 3000.'); return; }
  if (p < 0 || g < 0 || l < 0 || p > 300 || g > 500 || l > 300) { alert('Vérifie les protéines, glucides et lipides.'); return; }
  S.jour.push({ nom: nom, kcal: k, prot: p, gluc: g, lip: l, libre: true }); saveMenu(); vue();
 }
 function suppJour(i) { S.jour.splice(i, 1); saveMenu(); vue(); }
 function alerteJour(t, val) {
  var dep = [];
  if (t.kcal > val.kcal) dep.push('calories (+' + Math.round(t.kcal - val.kcal) + ' kcal)');
  if (t.prot > val.prot * 1.1) dep.push('protéines (+' + Math.round(t.prot - val.prot) + ' g)');
  if (t.gluc > val.gluc * 1.1) dep.push('glucides (+' + Math.round(t.gluc - val.gluc) + ' g)');
  if (t.lip > val.lip * 1.1) dep.push('lipides (+' + Math.round(t.lip - val.lip) + ' g)');
  if (dep.length) return "<div style='background:#4a1414;border:1px solid #ff5252;border-radius:8px;padding:10px;margin:8px 0'>⚠️ Tu dépasses tes besoins du jour : " + e(dep.join(', ')) + '. Pense à alléger tes prochains repas.</div>';
  if (t.kcal >= val.kcal * 0.9) return "<div style='background:#3d2a00;border:1px solid #ffb347;border-radius:8px;padding:10px;margin:8px 0'>Tu es presque à ta limite : il te reste " + Math.max(0, Math.round(val.kcal - t.kcal)) + ' kcal.</div>';
  return "<div style='color:#bdb59a;margin:8px 0'>Il te reste " + Math.round(val.kcal - t.kcal) + ' kcal pour aujourd’hui.</div>';
 }
 function ligneBilan(lab, a, b, u) { return '<div class="ligne"><span>' + lab + '</span><span>' + Math.round(a) + ' / ' + Math.round(b) + ' ' + u + '</span></div>'; }
 function menuHtml(np, val) {
  var h = "<button class='orange' style='width:100%' onclick='NUT.composer()'>" + (S.menu.length ? 'COMPOSER UN AUTRE MENU' : 'COMPOSER MON MENU DU JOUR') + '</button>';
  if (S.menu.length) {
   var tm = { kcal: 0, prot: 0, gluc: 0, lip: 0 }, manque = [];
   S.menu.forEach(function (it, i) {
    var r = it.id ? recById(it.id) : null;
    if (!r) { manque.push(it.c); h += "<div class='carte'><h3>" + (ICO[it.c] || '🍽️') + ' ' + e(it.c) + "</h3><p class='vide-msg'>Aucune recette compatible pour ce repas. Demande à ton coach d’en ajouter.</p></div>"; return; }
    var m = mac(r, it.f); tm.kcal += m.kcal; tm.prot += m.prot; tm.gluc += m.gluc; tm.lip += m.lip;
    var ing = String(r.ingredients).split(String.fromCharCode(10)).filter(Boolean).map(function (l) { var a = l.split('|'); return '<li>' + e(a[0].trim()) + (a[1] ? ' : ' + Math.round(num(a[1]) * it.f) + ' g' : '') + '</li>'; }).join('');
    var mg = S.jour.some(function (x) { return x.m === i; });
    h += "<div class='carte'><div style='font-size:14px;color:#d4af37'>" + (ICO[it.c] || '🍽️') + ' ' + e(it.c) + '</div><h3>' + e(r.nom) + "</h3><div style='font-size:14px;color:#bdb59a'>Portion : x" + it.f + ' (ajustée automatiquement)</div><div>' + macros(m) + '</div>' +
     '<details><summary>Ingrédients ajustés</summary><ul>' + ing + '</ul></details>' +
     "<button class='secondaire' onclick='NUT.changer(" + i + ")'>Changer ce plat</button><button class='" + (mg ? 'secondaire' : 'principal') + "' onclick='NUT.mange(" + i + ")'>" + (mg ? 'Mangé ✓ (annuler)' : 'J’ai mangé ce plat') + '</button></div>';
   });
   h += "<div class='carte'><h3>Total du menu</h3>" + ligneBilan('Calories', tm.kcal, val.kcal, 'kcal') + ligneBilan('Protéines', tm.prot, val.prot, 'g') + ligneBilan('Glucides', tm.gluc, val.gluc, 'g') + ligneBilan('Lipides', tm.lip, val.lip, 'g');
   if (manque.length) h += "<p style='color:#ffb347'>Il manque des recettes pour : " + e(manque.join(', ')) + '.</p>';
   else if (tm.kcal < val.kcal * 0.9) h += "<p style='color:#ffb347'>Le menu est en dessous de tes besoins (les portions sont limitées à x1,8). Ajoute une collation ou demande plus de recettes à ton coach.</p>";
   else if (tm.kcal > val.kcal * 1.05) h += "<p style='color:#ff7a7a'>Le menu dépasse un peu tes besoins (les portions sont limitées à x0,6). Choisis des plats plus légers avec « Changer ce plat ».</p>";
   h += '</div>';
  }
  var tj = somme(S.jour);
  h += "<div class='carte'><h3>Ce que j’ai mangé aujourd’hui</h3>" + ligneBilan('Calories', tj.kcal, val.kcal, 'kcal') + ligneBilan('Protéines', tj.prot, val.prot, 'g') + ligneBilan('Glucides', tj.gluc, val.gluc, 'g') + ligneBilan('Lipides', tj.lip, val.lip, 'g') + alerteJour(tj, val) +
   '<ul>' + (S.jour.length ? S.jour.map(function (x, i) { return '<li>' + e(x.nom) + ' : ' + Math.round(x.kcal) + " kcal <button class='danger' style='padding:4px 10px' onclick='NUT.suppJour(" + i + ")'>X</button></li>"; }).join('') : '<li>Rien noté pour le moment.</li>') + '</ul></div>';
  var rs = recettesPour(np, S.rec, true);
  h += "<div class='carte'><h3>Ajouter une recette</h3><select id='n_jrec'>" + rs.map(function (r) { return "<option value='" + r.id + "'>" + e(r.nom) + ' (' + Math.round(num(r.kcal)) + ' kcal)</option>'; }).join('') + "</select><select id='n_jpor'><option value='0.5'>Demi-portion</option><option value='0.75'>3/4</option><option value='1' selected>1 portion</option><option value='1.25'>1,25</option><option value='1.5'>1,5</option><option value='2'>2 portions</option></select><button class='principal' onclick='NUT.ajoutBib()'>Ajouter</button></div>" +
   "<div class='carte'><h3>Ajouter un aliment libre</h3>" + champ('jnom', 'Aliment (ex. gâteau)', '') + champ('jk', 'Calories (kcal)', '', 'numeric') + champ('jp', 'Protéines (g, facultatif)', '', 'decimal') + champ('jg', 'Glucides (g, facultatif)', '', 'decimal') + champ('jl', 'Lipides (g, facultatif)', '', 'decimal') + "<button class='principal' onclick='NUT.ajoutLibre()'>Ajouter</button></div>" +
   "<p class='vide-msg' style='font-size:12px'>Le menu et le journal sont enregistrés sur ce téléphone, pour la journée en cours.</p>";
  return h;
 }

 async function charger() {
  var u = S.user.id;
  var a = await sb.from('nutrition_profils').select('*').eq('client_id', u).maybeSingle();
  S.np = a.data;
  S.poids = (await sb.from('nutrition_suivi_poids').select('*').eq('client_id', u).order('date_mesure')).data || [];
  S.hist = (await sb.from('nutrition_historique_calculs').select('*').eq('client_id', u).order('date_calcul', { ascending: false }).limit(6)).data || [];
  S.rec = (await sb.from('nutrition_recettes').select('*').order('nom')).data || [];
  var r = (await sb.from('nutrition_reglages').select('*').eq('id', 1).maybeSingle()).data;
  if (r) R = r;
 }
 function champ(id, lab, val, mode) { return "<label style='font-size:14px;color:#bdb59a'>" + lab + "</label><input type='text' id='n_" + id + "' value='" + e(val) + "' inputmode='" + (mode || 'text') + "'>"; }
 function choix(id, lab, opts, val) {
  return "<label style='font-size:14px;color:#bdb59a'>" + lab + "</label><select id='n_" + id + "'><option value=''>Choisir...</option>" +
   Object.keys(opts).map(function (k) { var t = Array.isArray(opts[k]) ? opts[k][0] : opts[k]; return "<option value='" + k + "'" + (val === k ? ' selected' : '') + '>' + e(t) + '</option>'; }).join('') + '</select>';
 }
 function zone(id, lab, val) { return "<label style='font-size:14px;color:#bdb59a'>" + lab + "</label><textarea id='n_" + id + "' rows='2'>" + e(val) + '</textarea>'; }
 function v(id) { var x = q('n_' + id); return x ? x.value.trim() : ''; }
 function courbe(pts) {
  if (pts.length < 2) return '';
  var W = 320, H = 170, g = 40, vals = pts.map(function (p) { return num(p.poids); });
  var mn = Math.min.apply(null, vals) - 1, mx = Math.max.apply(null, vals) + 1, n = pts.length;
  var X = function (i) { return g + i * (W - g - 14) / (n - 1); }, Y = function (x) { return 20 + (mx - x) * (H - 50) / (mx - mn); };
  var l = vals.map(function (x, i) { return X(i).toFixed(1) + ',' + Y(x).toFixed(1); }).join(' ');
  return "<svg viewBox='0 0 " + W + ' ' + H + "' xmlns='http://www.w3.org/2000/svg' style='width:100%'><polyline points='" + l + "' fill='none' stroke='#ff7a00' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/>" +
   vals.map(function (x, i) { return "<circle cx='" + X(i).toFixed(1) + "' cy='" + Y(x).toFixed(1) + "' r='4' fill='#ffb347'/>"; }).join('') +
   "<text x='4' y='" + (Y(vals[0]) + 4).toFixed(1) + "' fill='#bdb59a' font-size='11'>" + d1(vals[0]) + "</text><text x='" + (W - 4) + "' y='" + (Y(vals[n - 1]) - 8).toFixed(1) + "' fill='#ffd9a0' font-size='12' text-anchor='end'>" + d1(vals[n - 1]) + ' kg</text></svg>';
 }
 function bandeau(t, pairs, fn) {
  return "<div style='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px'>" + pairs.map(function (a) {
   return "<button class='" + (t === a[0] ? 'orange' : 'secondaire') + "' data-t='" + a[0] + "' onclick='" + fn + "(this.dataset.t)'>" + a[1] + '</button>'; }).join('') + '</div>';
 }
 function macros(x) { return '<b>' + Math.round(num(x.kcal)) + ' kcal</b> · P ' + d1(x.prot) + ' g · G ' + d1(x.gluc) + ' g · L ' + d1(x.lip) + ' g'; }
 function carteRecette(r, coach) {
  var ing = String(r.ingredients).split(String.fromCharCode(10)).filter(Boolean).map(function (l) { var a = l.split('|'); return '<li>' + e(a[0].trim()) + (a[1] ? ' : ' + e(a[1].trim()) + ' g' : '') + '</li>'; }).join('');
  var et = String(r.etapes || '').split(String.fromCharCode(10)).filter(Boolean).map(function (l) { return '<li>' + e(l) + '</li>'; }).join('');
  return "<div class='carte'>" + (r.photo ? "<img src='" + e(r.photo) + "' alt='' style='width:100%;border-radius:8px;margin-bottom:6px'>" : "<div style='font-size:42px;text-align:center'>" + (ICO[r.categorie] || '🍽️') + '</div>') +
   '<h3>' + e(r.nom) + "</h3><div style='font-size:14px;color:#bdb59a'>" + e(r.categorie) + (r.minutes ? ' · ' + r.minutes + ' min' : '') + '</div><div>' + macros(r) + '</div>' +
   '<details><summary>Ingrédients et préparation</summary><ul>' + ing + '</ul><ol>' + et + '</ol></details>' +
   (coach ? "<div style='font-size:13px;color:#bdb59a'>Objectifs : " + e(r.objectifs) + ' · Allergènes : ' + e(r.allergenes || 'aucun') + "</div><button class='secondaire' data-id='" + r.id + "' onclick='NUT.editRec(this.dataset.id)'>Modifier</button><button class='danger' data-id='" + r.id + "' onclick='NUT.delRec(this.dataset.id)'>Supprimer</button>" : '') + '</div>';
 }

 function vue() {
  var ov = q('nutri'); if (!ov) return;
  var o = S.onglet, np = S.np, val = valeurs(np), h = '';
  if (o === 'profil') {
   var p = np || {};
   h = "<div class='carte'><h3>Mon profil nutritionnel</h3>" + (S.nom ? '<div>' + e(S.nom) + '</div>' : '') +
    choix('sexe', 'Sexe', { homme: 'Homme', femme: 'Femme' }, p.sexe) + champ('age', 'Âge', p.age, 'numeric') + champ('poids', 'Poids (kg)', p.poids, 'decimal') + champ('taille', 'Taille (cm)', p.taille, 'numeric') +
    choix('activite', 'Niveau d’activité quotidienne', AC, p.activite) + champ('seances', 'Séances sportives par semaine', p.seances == null ? '' : p.seances, 'numeric') + choix('objectif', 'Objectif', OBJ, p.objectif) +
    champ('repas', 'Nombre de repas par jour', p.repas || 3, 'numeric') + zone('allergies', 'Allergies alimentaires (séparées par des virgules)', p.allergies) + zone('interdits', 'Aliments interdits', p.interdits) + zone('preferences', 'Préférences alimentaires', p.preferences) +
    "<label style='display:block;margin:8px 0'><input type='checkbox' id='n_sensible'" + (p.sensible ? ' checked' : '') + '> Je suis enceinte, allaitante ou suivi(e) médicalement</label>' +
    "<button class='principal' onclick='NUT.save()'>Enregistrer et calculer</button></div>";
  } else if (o === 'besoins') {
   if (!np) h = "<p class='vide-msg'>Remplis d’abord ton profil.</p>";
   else if (!val) h = "<div class='carte'><h3>En attente de validation</h3><p>Ton profil est enregistré. Ton coach doit valider tes besoins avant de les afficher.</p></div>";
   else h = "<div class='carte'><h3>Mes besoins quotidiens</h3><span class='badge " + (val.coach && np.valide ? 'paye' : 'partiel') + "'>" + (val.coach ? (np.valide ? 'Validé par le coach' : 'Ajusté par le coach') : 'Calcul automatique') + '</span>' +
    "<div class='reste'>" + Math.round(val.kcal) + ' kcal / jour</div><div class="ligne"><span>Protéines</span><span>' + d1(val.prot) + ' g</span></div><div class="ligne"><span>Glucides</span><span>' + d1(val.gluc) + ' g</span></div><div class="ligne"><span>Lipides</span><span>' + d1(val.lip) + ' g</span></div>' +
    (np.bmr ? "<div style='font-size:14px;color:#bdb59a'>Métabolisme de base : " + np.bmr + ' kcal · Dépense totale : ' + np.tdee + ' kcal</div>' : '') + '<div>Objectif : ' + e(OBJ[np.objectif]) + '</div>' +
    (np.note_coach ? "<div style='margin-top:6px'><b>Note du coach :</b> " + e(np.note_coach) + '</div>' : '') +
    "<button class='orange' style='width:100%;margin-top:8px' onclick='NUT.actualiser()'>ACTUALISER MES BESOINS</button></div>" +
    "<details><summary>Historique de mes calculs</summary><ul>" + (S.hist.length ? S.hist.map(function (x) { return '<li>' + new Date(x.date_calcul).toLocaleDateString('fr-FR') + ' : ' + d1(x.poids) + ' kg, ' + Math.round(x.kcal) + ' kcal (' + (x.source === 'coach' ? 'coach' : 'auto') + ')</li>'; }).join('') : '<li>Aucun calcul.</li>') + '</ul></details>';
  } else if (o === 'menu') {
   if (!np) h = "<p class='vide-msg'>Remplis d’abord ton profil.</p>";
   else if (!val) h = "<div class='carte'><h3>En attente de validation</h3><p>Ton coach doit valider tes besoins avant de composer ton menu.</p></div>";
   else h = menuHtml(np, val);
  } else if (o === 'recettes') {
   if (!np) h = "<p class='vide-msg'>Remplis d’abord ton profil.</p>";
   else {
    var rs = recettesPour(np, S.rec, S.tous).filter(function (r) { return !S.cat || r.categorie === S.cat; });
    h = "<select onchange='NUT.setCat(this.value)'><option value=''>Toutes les catégories</option>" + CATS.map(function (c) { return "<option value='" + c + "'" + (S.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>' +
     "<button class='secondaire' onclick='NUT.toggleTous()'>" + (S.tous ? 'Voir les recettes adaptées à mes calories' : 'Voir toutes les recettes compatibles') + '</button>' +
     (rs.length ? rs.map(function (r) { return carteRecette(r, false); }).join('') : "<p class='vide-msg'>Aucune recette adaptée pour le moment.</p>");
   }
  } else {
   var last = S.poids[S.poids.length - 1], first = S.poids[0];
   h = "<div class='carte'><h3>Mon poids</h3>" + champ('nouveaupoids', 'Nouveau poids (kg)', '', 'decimal') + "<button class='principal' onclick='NUT.addPoids()'>Enregistrer mon poids</button>" +
    (last ? "<div class='ligne'><span>Poids initial</span><span>" + d1(first.poids) + ' kg</span></div><div class="ligne"><span>Poids actuel</span><span>' + d1(last.poids) + ' kg</span></div><div class="ligne solde"><span>Évolution</span><span>' + (last.poids - first.poids > 0 ? '+' : '') + d1(last.poids - first.poids) + ' kg</span></div>' : '') +
    (np ? '<div>Objectif : ' + e(OBJ[np.objectif]) + '</div>' : '') + courbe(S.poids) +
    "<details><summary>Historique</summary><ul>" + S.poids.slice().reverse().slice(0, 15).map(function (x) { return '<li>' + new Date(x.date_mesure).toLocaleDateString('fr-FR') + ' : ' + d1(x.poids) + ' kg</li>'; }).join('') + '</ul></details>' +
    "<button class='orange' style='width:100%;margin-top:8px' onclick='NUT.actualiser()'>ACTUALISER MES BESOINS</button></div>";
  }
  ov.innerHTML = enTete() + bandeau(o, [['profil', 'Profil'], ['besoins', 'Besoins'], ['menu', 'Menu'], ['recettes', 'Recettes'], ['poids', 'Poids']], 'NUT.go') + h +
   "<p class='vide-msg' style='font-size:12px'>Calculs indicatifs (formule de Mifflin-St Jeor). Ils ne remplacent pas un avis médical.</p>";
 }
 function enTete() { return "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px'><div style='color:#d4af37;font-size:17px'>SARSAR TAIEB COACHING<br><span style='font-size:13px'>Sport &amp; Nutrition — Mon Nutrition Coach</span></div><button class='secondaire' onclick='NUT.fermer()'>Fermer</button></div>"; }

 async function sauver(p, sensible, nouveauPoids) {
  var c = sensible ? null : calcul(p, R);
  var row = { client_id: S.user.id, sexe: p.sexe, age: p.age, poids: p.poids, taille: p.taille, activite: p.activite, seances: p.seances, objectif: p.objectif, repas: p.repas, allergies: p.allergies, interdits: p.interdits, preferences: p.preferences, sensible: sensible,
   bmr: c ? c.bmr : null, tdee: c ? c.tdee : null, kcal: c ? c.kcal : null, prot: c ? c.prot : null, gluc: c ? c.gluc : null, lip: c ? c.lip : null, maj_le: new Date().toISOString() };
  var r = await sb.from('nutrition_profils').upsert(row);
  if (r.error) { alert('Erreur : ' + r.error.message); return false; }
  var last = S.poids[S.poids.length - 1];
  if (nouveauPoids || !last || Math.abs(num(last.poids) - p.poids) > 0.001) await sb.from('nutrition_suivi_poids').insert({ client_id: S.user.id, poids: p.poids });
  if (c) await sb.from('nutrition_historique_calculs').insert({ client_id: S.user.id, poids: p.poids, objectif: p.objectif, bmr: c.bmr, tdee: c.tdee, kcal: c.kcal, prot: c.prot, gluc: c.gluc, lip: c.lip, source: 'auto' });
  return true;
 }
 async function enregistrer() {
  var p = { sexe: v('sexe'), age: num(v('age')), poids: num(v('poids')), taille: num(v('taille')), activite: v('activite'), seances: num(v('seances')), objectif: v('objectif'), repas: num(v('repas')), allergies: v('allergies'), interdits: v('interdits'), preferences: v('preferences') };
  var err = verifier(p); if (err) { alert(err); return; }
  var sensible = p.age < 18 || q('n_sensible').checked;
  if (await sauver(p, sensible, false)) { await charger(); S.onglet = 'besoins'; vue(); if (sensible) alert('Profil enregistré. Ton coach doit valider tes besoins.'); }
 }
 async function actualiser() {
  if (!S.np) { alert('Remplis d’abord ton profil.'); return; }
  var w = num(prompt('Ton poids actuel en kg :', S.np.poids));
  if (!(w >= 30 && w <= 300)) { alert('Poids entre 30 et 300 kg.'); return; }
  var avant = valeurs(S.np), p = Object.assign({}, S.np, { poids: w });
  if (await sauver(p, S.np.sensible || S.np.age < 18, true)) {
   await charger(); S.onglet = 'besoins'; vue(); var ap = valeurs(S.np);
   if (avant && ap) alert('Besoins actualisés : ' + Math.round(ap.kcal) + ' kcal (avant : ' + Math.round(avant.kcal) + ').');
  }
 }
 async function ajouterPoids() {
  var w = num(v('nouveaupoids'));
  if (!(w >= 30 && w <= 300)) { alert('Poids entre 30 et 300 kg.'); return; }
  var r = await sb.from('nutrition_suivi_poids').insert({ client_id: S.user.id, poids: w });
  if (r.error) { alert('Erreur : ' + r.error.message); return; }
  await charger(); vue();
 }

 function vCoach() {
  var ov = q('nutri'), h = '';
  if (S.tab === 'adh') {
   var s = norm(S.rech || '');
   var cl = S.clients.filter(function (c) { return !s || norm((c.nom || '') + ' ' + c.email).indexOf(s) >= 0; });
   h = "<input type='text' id='n_rech' placeholder='Rechercher un adhérent' value='" + e(S.rech || '') + "' oninput='NUT.rech(this.value)'>" + (S.sel ? '' : '<div id="n_liste">' + cl.map(function (c) {
    var np = S.nps.filter(function (x) { return x.client_id === c.id; })[0], val = valeurs(np);
    return "<div class='carte'><h3>" + e(c.nom || c.email) + '</h3>' + (np ? '<div>' + e(OBJ[np.objectif] || '') + ' · ' + d1(np.poids) + ' kg</div><div>' + (val ? macros(val) : 'À valider') + '</div>' + (np.sensible ? "<span class='badge partiel'>Validation requise</span>" : '') : "<div class='vide-msg' style='text-align:left'>Profil non rempli</div>") +
     "<button class='principal' data-id='" + c.id + "' onclick='NUT.choisir(this.dataset.id)'>Ouvrir</button></div>"; }).join('') + '</div>');
   if (S.sel) h += S.detail || '';
  } else if (S.tab === 'rec') {
   var r = S.edit || {};
   h = "<div class='carte'><h3>" + (r.id ? 'Modifier la recette' : 'Ajouter une recette') + '</h3>' + champ('rnom', 'Nom', r.nom) + choix('rcat', 'Catégorie', CATS.reduce(function (o, c) { o[c] = c; return o; }, {}), r.categorie) + champ('rphoto', 'Lien de la photo (facultatif)', r.photo) +
    zone('ring', 'Ingrédients, un par ligne : Nom | grammes', r.ingredients) + champ('rkcal', 'Calories totales', r.kcal, 'decimal') + champ('rprot', 'Protéines (g)', r.prot, 'decimal') + champ('rgluc', 'Glucides (g)', r.gluc, 'decimal') + champ('rlip', 'Lipides (g)', r.lip, 'decimal') + champ('rmin', 'Temps de préparation (min)', r.minutes, 'numeric') +
    zone('retapes', 'Étapes, une par ligne', r.etapes) + champ('robj', 'Objectifs (seche, masse, maintien)', r.objectifs || 'seche,masse,maintien') + champ('rall', 'Allergènes (gluten, lait, oeufs, poisson...)', r.allergenes) +
    "<button class='principal' onclick='NUT.saveRec()'>Enregistrer la recette</button>" + (r.id ? "<button class='secondaire' onclick='NUT.editRec(0)'>Annuler</button>" : '') + '</div>' + S.rec.map(function (x) { return carteRecette(x, true); }).join('');
  } else {
   h = "<div class='carte'><h3>Réglages des calculs</h3>" + champ('ajs', 'Ajustement sèche (% de calories, ex : -15)', R.ajust_seche, 'decimal') + champ('ajm', 'Ajustement masse (% de calories, ex : 10)', R.ajust_masse, 'decimal') +
    champ('ps', 'Protéines sèche (g par kg)', R.prot_seche, 'decimal') + champ('pm', 'Protéines masse (g par kg)', R.prot_masse, 'decimal') + champ('pn', 'Protéines maintien (g par kg)', R.prot_maintien, 'decimal') + champ('lp', 'Lipides (% des calories)', R.lip_pct, 'decimal') +
    "<button class='principal' onclick='NUT.saveReg()'>Enregistrer les réglages</button></div>";
  }
  ov.innerHTML = enTete() + bandeau(S.tab, [['adh', 'Adhérents'], ['rec', 'Recettes'], ['reg', 'Réglages']], 'NUT.tab') + h;
 }
 async function chargerCoach() {
  S.clients = ((await sb.from('profils').select('id,nom,email').eq('role', 'client').order('nom')).data) || [];
  S.nps = (await sb.from('nutrition_profils').select('*')).data || [];
  S.rec = (await sb.from('nutrition_recettes').select('*').order('nom')).data || [];
  var r = (await sb.from('nutrition_reglages').select('*').eq('id', 1).maybeSingle()).data; if (r) R = r;
 }
 async function choisir(id) {
  S.sel = id; var np = S.nps.filter(function (x) { return x.client_id === id; })[0], c = S.clients.filter(function (x) { return x.id === id; })[0];
  var pw = (await sb.from('nutrition_suivi_poids').select('*').eq('client_id', id).order('date_mesure', { ascending: false }).limit(8)).data || [];
  var hs = (await sb.from('nutrition_historique_calculs').select('*').eq('client_id', id).order('date_calcul', { ascending: false }).limit(6)).data || [];
  var val = valeurs(np) || {};
  if (!np) S.detail = "<div class='carte'><h3>" + e(c.nom || c.email) + "</h3><p>Profil non rempli.</p><button class='secondaire' onclick='NUT.retour()'>Retour</button></div>";
  else S.detail = "<div class='carte'><h3>" + e(c.nom || c.email) + '</h3><div>' + (np.sexe === 'homme' ? 'Homme' : 'Femme') + ', ' + np.age + ' ans, ' + d1(np.poids) + ' kg, ' + d1(np.taille) + ' cm · ' + e(AC[np.activite] ? AC[np.activite][0] : '') + ', ' + np.seances + ' séance(s)/sem, ' + np.repas + ' repas/jour</div>' +
   '<div>Allergies : ' + e(np.allergies || 'aucune') + '<br>Interdits : ' + e(np.interdits || 'aucun') + '<br>Préférences : ' + e(np.preferences || '-') + '</div>' + (np.sensible ? "<span class='badge partiel'>Mineur, enceinte ou suivi médical : saisie manuelle requise</span>" : '<div>Calcul auto : ' + (np.kcal != null ? np.kcal + ' kcal, P ' + np.prot + ', G ' + np.gluc + ', L ' + np.lip : '-') + '</div>') +
   choix('cobj', 'Objectif', OBJ, np.objectif) + champ('ckcal', 'Calories', val.kcal == null ? '' : Math.round(val.kcal), 'numeric') + champ('cprot', 'Protéines (g)', val.prot == null ? '' : Math.round(val.prot), 'numeric') + champ('cgluc', 'Glucides (g)', val.gluc == null ? '' : Math.round(val.gluc), 'numeric') + champ('clip', 'Lipides (g)', val.lip == null ? '' : Math.round(val.lip), 'numeric') + zone('cnote', 'Note pour l’adhérent', np.note_coach) +
   "<button class='principal' onclick='NUT.saveCoach()'>Enregistrer et valider</button><button class='secondaire' onclick='NUT.resetCoach()'>Retirer mes modifications</button><button class='secondaire' onclick='NUT.retour()'>Retour</button>" +
   '<details><summary>Historique du poids</summary><ul>' + pw.map(function (x) { return '<li>' + new Date(x.date_mesure).toLocaleDateString('fr-FR') + ' : ' + d1(x.poids) + ' kg</li>'; }).join('') + '</ul></details>' +
   '<details><summary>Historique des calculs</summary><ul>' + hs.map(function (x) { return '<li>' + new Date(x.date_calcul).toLocaleDateString('fr-FR') + ' : ' + Math.round(x.kcal) + ' kcal (' + x.source + ')</li>'; }).join('') + '</ul></details></div>';
  vCoach();
 }
 async function enregistrerCoach() {
  var k = num(v('ckcal')), p = num(v('cprot')), g = num(v('cgluc')), l = num(v('clip'));
  if (!(k >= 800 && k <= 6000 && p >= 0 && g >= 0 && l >= 0)) { alert('Valeurs hors limites (calories de 800 à 6000).'); return; }
  if (!coherent(k, p, g, l) && !confirm('Les calories ne correspondent pas aux macros (' + Math.round(4 * p + 4 * g + 9 * l) + ' kcal). Enregistrer quand même ?')) return;
  var r = await sb.from('nutrition_profils').update({ objectif: v('cobj'), kcal_c: k, prot_c: p, gluc_c: g, lip_c: l, valide: true, note_coach: v('cnote') || null }).eq('client_id', S.sel);
  if (r.error) { alert('Erreur : ' + r.error.message); return; }
  var np = S.nps.filter(function (x) { return x.client_id === S.sel; })[0];
  await sb.from('nutrition_historique_calculs').insert({ client_id: S.sel, poids: np.poids, objectif: v('cobj'), kcal: k, prot: p, gluc: g, lip: l, source: 'coach' });
  await chargerCoach(); choisir(S.sel);
 }
 async function sauverRecette() {
  var r = { nom: v('rnom'), categorie: v('rcat'), photo: v('rphoto') || null, ingredients: v('ring'), kcal: num(v('rkcal')), prot: num(v('rprot')), gluc: num(v('rgluc')), lip: num(v('rlip')), minutes: num(v('rmin')) || null, etapes: v('retapes'), objectifs: liste(v('robj')).join(','), allergenes: v('rall') };
  if (!r.nom || !r.categorie || !r.ingredients || !(r.kcal > 0)) { alert('Nom, catégorie, ingrédients et calories sont obligatoires.'); return; }
  if (!coherent(r.kcal, r.prot, r.gluc, r.lip) && !confirm('Les calories ne correspondent pas aux macros. Enregistrer quand même ?')) return;
  var x = S.edit && S.edit.id ? await sb.from('nutrition_recettes').update(r).eq('id', S.edit.id) : await sb.from('nutrition_recettes').insert(r);
  if (x.error) { alert('Erreur : ' + x.error.message); return; }
  S.edit = null; await chargerCoach(); vCoach();
 }

 function fermer() { var o = q('nutri'); if (o) o.remove(); }
 function cadre() { fermer(); var d = document.createElement('div'); d.id = 'nutri'; d.className = 'nt'; document.body.appendChild(d); return d; }
 async function ouvrir() {
  if (!S.user) return;
  cadre(); q('nutri').innerHTML = "<p class='vide-msg'>Chargement...</p>";
  if (S.role === 'coach') { await chargerCoach(); S.tab = 'adh'; S.sel = null; vCoach(); }
  else { await charger(); chargerMenu(); S.onglet = S.np ? 'besoins' : 'profil'; vue(); }
 }
 async function maj() {
  var b = q('nutriBtn'); if (!b) return;
  var u = (await sb.auth.getUser()).data.user;
  if (!u) { b.style.display = 'none'; fermer(); return; }
  var p = (await sb.from('profils').select('role,nom').eq('id', u.id).maybeSingle()).data;
  S.user = u; S.role = p ? p.role : null; S.nom = p ? p.nom : '';
  b.style.display = 'block';
 }
 window.NUT = {
  composer: composer, changer: changer, mange: mange, ajoutBib: ajoutBib, ajoutLibre: ajoutLibre, suppJour: suppJour,
  go: function (t) { S.onglet = t; vue(); }, save: enregistrer, actualiser: actualiser, addPoids: ajouterPoids, fermer: fermer,
  setCat: function (c) { S.cat = c; vue(); }, toggleTous: function () { S.tous = !S.tous; vue(); },
  tab: function (t) { S.tab = t; S.sel = null; S.edit = null; vCoach(); }, rech: function (t) { S.rech = t; var s = q('n_rech'); vCoach(); var n = q('n_rech'); if (n) { n.focus(); n.setSelectionRange(t.length, t.length); } },
  choisir: choisir, retour: function () { S.sel = null; S.detail = ''; vCoach(); }, saveCoach: enregistrerCoach,
  resetCoach: async function () { if (!confirm('Retirer tes modifications ? Les valeurs automatiques seront affichées.')) return; var r = await sb.from('nutrition_profils').update({ kcal_c: null, prot_c: null, gluc_c: null, lip_c: null, valide: false, note_coach: null }).eq('client_id', S.sel); if (erreur(r)) return; await chargerCoach(); choisir(S.sel); },
  editRec: function (id) { S.edit = id ? S.rec.filter(function (x) { return String(x.id) === String(id); })[0] : null; vCoach(); scrollTo(0, 0); },
  delRec: async function (id) { if (!confirm('Supprimer cette recette ?')) return; var r = await sb.from('nutrition_recettes').delete().eq('id', id); if (r.error) { alert('Erreur : ' + r.error.message); return; } await chargerCoach(); vCoach(); },
  saveRec: sauverRecette,
  saveReg: async function () {
   var n = { id: 1, ajust_seche: num(v('ajs')), ajust_masse: num(v('ajm')), prot_seche: num(v('ps')), prot_masse: num(v('pm')), prot_maintien: num(v('pn')), lip_pct: num(v('lp')) };
   if (n.ajust_seche < -30 || n.ajust_seche > 0 || n.ajust_masse < 0 || n.ajust_masse > 25 || n.prot_seche < 1 || n.prot_seche > 3.5 || n.prot_masse < 1 || n.prot_masse > 3.5 || n.prot_maintien < 1 || n.prot_maintien > 3.5 || n.lip_pct < 15 || n.lip_pct > 40) { alert('Valeurs hors limites : sèche de -30 à 0, masse de 0 à 25, protéines de 1 à 3,5 g/kg, lipides de 15 à 40 %.'); return; }
   var r = await sb.from('nutrition_reglages').upsert(n); if (erreur(r)) return; R = n; alert('Réglages enregistrés.');
  },
  _t: { calcul: calcul, verifier: verifier, valeurs: valeurs, bloque: bloque, recettesPour: recettesPour, coherent: coherent, R: R }
 };
 function erreur(r) { if (r && r.error) { alert('Erreur : ' + r.error.message); return true; } return false; }

 window.addEventListener('load', function () {
  var st = document.createElement('style');
  st.textContent = '.nt{position:fixed;top:0;right:0;bottom:0;left:0;z-index:1000;background:#000;color:#f5f1e6;overflow-y:auto;padding:12px;padding-top:calc(12px + env(safe-area-inset-top));max-width:100%;box-sizing:border-box}.nt textarea{width:100%;padding:12px;margin:6px 0;border:1px solid #4a4128;border-radius:8px;box-sizing:border-box;font-size:16px;background:#1f1f1f;color:#f5f1e6;font-family:inherit}.nt>*{max-width:600px;margin-left:auto;margin-right:auto}#nutriBtn{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:900;display:none;background:#ff7a00;color:#000;font-weight:bold;border:none;border-radius:24px;padding:12px 18px;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.6)}';
  document.head.appendChild(st);
  var b = document.createElement('button'); b.id = 'nutriBtn'; b.textContent = 'Nutrition'; b.onclick = ouvrir; document.body.appendChild(b);
  sb.auth.onAuthStateChange(function () { setTimeout(maj, 300); });
  maj();
 });
})();
