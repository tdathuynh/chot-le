import type { Coords } from './location';

export type MapPin = { id: string; lat: number; lng: number; label: string; name: string };

/**
 * Trang HTML bản đồ (Leaflet + nền OpenStreetMap), dùng chung cho WebView (điện thoại) và iframe (web).
 * Ghim hiện giá khởi điểm ("55k"); bấm ghim → gửi {type:'select', id} ra app.
 * Trạng thái chọn ghim xử lý ngay trong trang để bản đồ không tải lại khi app đổi state.
 */
export function buildMapHtml({
  pins,
  me,
  dark,
  tint,
  tintText,
}: {
  pins: MapPin[];
  me: Coords | null;
  dark: boolean;
  tint: string;
  tintText: string;
}): string {
  // JSON nhúng trong <script>: chặn chuỗi "</" để tên quán không phá thẻ script.
  const data = JSON.stringify({ pins, me }).replace(/</g, '\\u003c');
  return `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<style>
  html,body,#map{height:100%;margin:0;background:${dark ? '#121110' : '#FAF6F0'}}
  .pin{transform:translate(-50%,-100%);display:inline-block;white-space:nowrap;font:600 13px/1 system-ui,-apple-system,"Segoe UI",sans-serif;
    padding:7px 10px;border-radius:999px;background:${dark ? '#1C1A17' : '#fff'};color:${dark ? '#F5F2EB' : '#1F1A17'};
    border:1.5px solid ${tint};box-shadow:0 2px 6px rgba(0,0,0,.25)}
  .pin.sel{background:${tint};color:${tintText};transform:translate(-50%,-100%) scale(1.12)}
  .me{width:14px;height:14px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25);transform:translate(-50%,-50%)}
  .leaflet-div-icon{background:none;border:none}
  .pin.dot{font-size:0;padding:0;width:14px;height:14px;background:${tint};border-color:${dark ? '#1C1A17' : '#fff'};border-width:2px}
  ${dark ? '.leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.85) contrast(.9) saturate(.6)}' : ''}
</style></head><body><div id="map"></div><script>
  var D = ${data};
  function send(msg){ var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s); else window.parent.postMessage(s, '*'); }
  var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([10.7769, 106.7009], 13);
  // Nền OpenStreetMap (miễn phí, cần ghi nguồn). Dùng nhiều thì nên chuyển sang nhà cung cấp có khóa (MapTiler, Stadia…).
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  var pts = [], markers = [];
  function clearSel(){ document.querySelectorAll('.pin.sel').forEach(function(x){ x.classList.remove('sel'); }); markers.forEach(function(m){ m.setZIndexOffset(0); }); }
  D.pins.forEach(function(p){
    var el = document.createElement('div'); el.className = 'pin'; el.textContent = p.label;
    el.title = p.name;
    var m = L.marker([p.lat, p.lng], { icon: L.divIcon({ html: el.outerHTML, iconSize: null })  }).addTo(map);
    m.on('click', function(e){
      clearSel(); var pe = m.getElement() && m.getElement().querySelector('.pin'); if (pe) { pe.classList.remove('dot'); pe.classList.add('sel'); } m.setZIndexOffset(1000);
      if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
      send({ type: 'select', id: p.id }); });
    markers.push(m);
    pts.push([p.lat, p.lng]);
  });
  if (D.me) { L.marker([D.me.latitude, D.me.longitude], { icon: L.divIcon({ html: '<div class="me"></div>', iconSize: null }), interactive: false }).addTo(map); pts.push([D.me.latitude, D.me.longitude]); }
  if (pts.length > 1) map.fitBounds(pts, { padding: [48, 48], maxZoom: 15 }); else if (pts.length) map.setView(pts[0], 15);
  map.on('click', function(){ clearSel(); send({ type: 'select', id: null }); declutter(); });
  // Ghim chồng nhau → ghim sau thu thành chấm nhỏ (vẫn bấm được); phóng to thì hiện lại nhãn giá.
  function declutter(){
    var kept = [];
    markers.forEach(function(m){
      var pe = m.getElement() && m.getElement().querySelector('.pin'); if (!pe) return;
      pe.classList.remove('dot');
      var b = pe.getBoundingClientRect();
      var hit = !pe.classList.contains('sel') && kept.some(function(k){ return b.left < k.right + 4 && b.right > k.left - 4 && b.top < k.bottom + 4 && b.bottom > k.top - 4; });
      if (hit) pe.classList.add('dot'); else kept.push(b);
    });
  }
  map.on('zoomend moveend', declutter);
  setTimeout(declutter, 50);
</script></body></html>`;
}
