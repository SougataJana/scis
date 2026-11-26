<footer class="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <h4><?= e($event['school']) ?></h4>
        <p><?= e($event['university']) ?><br>Founded as the School of Information Technology (SIT)</p>
        <p class="small">Sponsored by the DBT-Bioinformatics Center, SC&amp;IS, JNU, the Royal Society of Chemistry, the American Chemical Society, Advent Informatics Pvt Ltd, GROWDEA Technologies and Zastra Innovations.</p>
        <div class="sponsor-rows">
          <div class="sponsor-logos">
          <a href="https://dbtindia.gov.in" target="_blank" rel="noopener" aria-label="Department of Biotechnology, Government of India (DBT-Bioinformatics Center)"><img src="assets/img/dbt-logo.png" width="292" height="200" alt="Department of Biotechnology, Government of India" loading="lazy" decoding="async"></a>
          <a href="https://www.jnu.ac.in" target="_blank" rel="noopener" aria-label="School of Computational and Integrative Sciences, JNU"><img src="assets/img/jnu-logo.png" width="447" height="447" alt="SC&amp;IS, Jawaharlal Nehru University" loading="lazy" decoding="async"></a>
          <a href="https://www.rsc.org" target="_blank" rel="noopener" aria-label="Royal Society of Chemistry"><img src="assets/img/rsc-logo.svg" width="250" height="70" alt="Royal Society of Chemistry" loading="lazy" decoding="async"></a>
          </div>
          <div class="sponsor-logos">
          <a href="https://www.acs.org" target="_blank" rel="noopener" aria-label="American Chemical Society"><img src="assets/img/acs-logo.png" width="630" height="201" alt="American Chemical Society" loading="lazy" decoding="async"></a>
          <a href="https://www.adventinformatics.com" target="_blank" rel="noopener" aria-label="Advent Informatics Pvt Ltd"><img src="assets/img/advent-logo.png" width="900" height="262" alt="Advent Informatics Pvt Ltd" loading="lazy" decoding="async"></a>
          </div>
          <div class="sponsor-logos row3">
          <img src="assets/img/growdea-logo.png" width="768" height="217" alt="GROWDEA Technologies" loading="lazy" decoding="async">
          <img src="assets/img/zastra-logo.png" width="846" height="202" alt="Zastra Innovations" loading="lazy" decoding="async">
          </div>
        </div>
      </div>
      <div>
        <h4>Organising secretaries</h4>
        <p>Shandar Ahmad · Mukesh Jain · Jyoti Singh Kirar · Kunwer Singh Mathur · Abinaya Manivannan · Gajendra Pratap Singh · Pallavi Somvanshi</p>
      </div>
      <div>
        <h4>Quick links</h4>
        <p><a href="#programme" data-fx="helix">Programme</a><br><a href="#contact">Contact</a><br><a href="assets/img/flyer.jpg" target="_blank" rel="noopener">Flyer</a><br><a href="assets/docs/scis25-abstract-booklet.pdf" target="_blank" rel="noopener">Abstract Book</a><br><a href="<?= e($event['register_url']) ?>" target="_blank" rel="noopener">Register</a></p>
      </div>
    </div>
    <p class="fine"><span>© 2026 SC&amp;IS, JNU · Silver Jubilee Symposium · 27–28 November 2026</span><span class="credit">Designed &amp; developed by <a href="<?= e($credit['url']) ?>" target="_blank" rel="noopener"><?= e($credit['name']) ?></a><br><a class="credit-email" href="mailto:<?= e($credit['email']) ?>"><?= e($credit['email']) ?></a></span></p>
  </div>
</footer>
