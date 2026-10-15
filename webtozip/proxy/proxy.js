(function () {
  var ALLOWED = ['webtozipcid-v2.vercel.app'];
  var ok = ALLOWED.indexOf(location.hostname) !== -1 && window.top === window.self;
  var gate = false;
  try { gate = !!sessionStorage.getItem('w2z_gate'); } catch (e) {}
  if (ok && gate) return;
  try { sessionStorage.setItem('w2z_next', location.pathname); } catch (e) {}
  document.documentElement.innerHTML = '';
  location.replace('/');
})();
