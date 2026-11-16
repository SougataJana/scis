<footer class="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <h4><?= e($event['school']) ?></h4>
        <p><?= e($event['university']) ?><br>Founded as the School of Information Technology (SIT)</p>
        <p class="small">Sponsored by the DBT-Bioinformatics Center, SC&amp;IS, JNU and the Royal Society of Chemistry.</p>
        <div class="sponsor-logos">
          <a href="https://dbtindia.gov.in" target="_blank" rel="noopener" aria-label="Department of Biotechnology, Government of India (DBT-Bioinformatics Center)"><img src="assets/img/dbt-logo.png" width="292" height="200" alt="Department of Biotechnology, Government of India" loading="lazy" decoding="async"></a>
          <a href="https://www.jnu.ac.in" target="_blank" rel="noopener" aria-label="School of Computational and Integrative Sciences, JNU"><img src="assets/img/jnu-logo.png" width="447" height="447" alt="SC&amp;IS, Jawaharlal Nehru University" loading="lazy" decoding="async"></a>
          <a href="https://www.rsc.org" target="_blank" rel="noopener" aria-label="Royal Society of Chemistry"><img src="assets/img/rsc-logo.svg" width="250" height="70" alt="Royal Society of Chemistry" loading="lazy" decoding="async"></a>
        </div>
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
