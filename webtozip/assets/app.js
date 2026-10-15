window.ui = {
  ask: function (title, message, okText, withCancel) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.className = 'ov';
      ov.innerHTML = '<div class="glass dlg" role="dialog" aria-modal="true"><h3></h3><p></p><div class="row"><button class="btn ghost" data-v="0">Batal</button><button class="btn" data-v="1"></button></div></div>';
      ov.querySelector('h3').textContent = title;
      ov.querySelector('p').textContent = message;
      var ok = ov.querySelector('[data-v="1"]');
      ok.textContent = okText || 'Lanjut';
      if (withCancel === false) ov.querySelector('[data-v="0"]').hidden = true;
      var done = function (v) { document.removeEventListener('keydown', esc); ov.remove(); resolve(v); };
      var esc = function (e) { if (e.key === 'Escape') done(false); };
      ov.addEventListener('click', function (e) {
        if (e.target === ov) done(false);
        else if (e.target.dataset && e.target.dataset.v) done(e.target.dataset.v === '1');
      });
      document.addEventListener('keydown', esc);
      document.body.appendChild(ov);
      ok.focus();
    });
  },
  info: function (title, message) { return this.ask(title, message, 'Mengerti', false); }
};
