<footer class="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <h4><?= e($event['school']) ?></h4>
        <p><?= e($event['university']) ?><br>Founded as the School of Information Technology (SIT)</p>
        <p class="small">Sponsored by the DBT-Bioinformatics Center, SC&amp;IS, JNU.</p>
      </div>
      <div>
        <h4>Organising secretaries</h4>
        <p>Shandar Ahmad · Mukesh Jain · Jyoti Singh Kirar · Kunwer Singh Mathur · Abinaya Manivannan · Gajendra Pratap Singh · Pallavi Somvanshi</p>
      </div>
      <div>
        <h4>Quick links</h4>
        <p><a href="#programme" data-fx="helix">Programme</a><br><a href="#contact">Contact</a><br><a href="assets/img/flyer.jpg" target="_blank" rel="noopener">Flyer</a><br><a href="<?= e($event['register_url']) ?>" target="_blank" rel="noopener">Register</a></p>
      </div>
    </div>
    <p class="fine"><span>© 2026 SC&amp;IS, JNU · Silver Jubilee Symposium · 27–28 November 2026</span><span class="credit">Designed &amp; developed by <a href="<?= e($credit['url']) ?>" target="_blank" rel="noopener"><?= e($credit['name']) ?></a><br><a class="credit-email" href="mailto:<?= e($credit['email']) ?>"><?= e($credit['email']) ?></a></span></p>
  </div>
</footer>
