<section class="section sponsors" id="sponsors" data-scene="3">
  <div class="wrap">
    <p class="eyebrow" data-reveal>Sponsors</p>
    <h2 class="big" data-split>Meet our sponsors.</h2>
    <p class="body" data-reveal>The symposium is made possible by the generous support of our partners.</p>

    <div class="sp-grid">
      <article class="sp-card glass" data-reveal>
        <a class="sp-logo" href="https://www.acs.org" target="_blank" rel="noopener" aria-label="American Chemical Society"><img src="assets/img/acs-logo.png" width="630" height="201" alt="American Chemical Society" loading="lazy" decoding="async"></a>
        <p class="person-role">Best Poster Prizes</p>
        <h3>American Chemical Society</h3>
        <p class="sp-text">ACS will support five Best Poster Prizes from the journals below. Each winner will receive a journal certificate and INR&nbsp;3,000.</p>
        <ul class="sp-journals" aria-label="Poster prize journals">
          <?php foreach ([
              ['jpcb', 'The Journal of Physical Chemistry B', 'J. Phys. Chem. B'],
              ['bmcau', 'ACS Bio &amp; Med Chem Au', 'ACS Bio &amp; Med Chem Au'],
              ['omega', 'ACS Omega', 'ACS Omega'],
              ['biochemistry', 'Biochemistry', 'Biochemistry'],
              ['jctc', 'Journal of Chemical Theory and Computation', 'JCTC'],
          ] as [$k, $alt, $cap]): ?>
            <li><span class="sp-j"><img src="assets/img/journals/<?= $k ?>.png" alt="<?= $alt ?>" loading="lazy" decoding="async"></span><small><?= $cap ?></small></li>
          <?php endforeach; ?>
        </ul>
      </article>

      <article class="sp-card glass" data-reveal>
        <a class="sp-logo rsc" href="https://www.rsc.org" target="_blank" rel="noopener" aria-label="Royal Society of Chemistry"><img src="assets/img/rsc-logo.svg" width="250" height="70" alt="Royal Society of Chemistry" loading="lazy" decoding="async"></a>
        <p class="person-role">Community partner</p>
        <h3>Royal Society of Chemistry</h3>
        <p class="sp-text">RSC membership connects chemical scientists to careers support and mentoring, networking events, travel grants and conference bursaries, free article downloads and Chemistry World.</p>
        <p class="sp-links">
          <a class="btn sm primary" href="https://www.rsc.org/membership-and-community/join/" target="_blank" rel="noopener"><span>Explore RSC membership</span><i class="arrow"></i></a>
          <a class="inline-map-link" href="assets/docs/rsc-membership.pdf" target="_blank" rel="noopener">Membership flyer (PDF)</a>
        </p>
      </article>
    </div>

    <p class="sp-org" data-reveal>Organised by the School of Computational &amp; Integrative Sciences, JNU &nbsp;·&nbsp; Sponsored by the DBT-Bioinformatics Center, SC&amp;IS, JNU</p>
  </div>
</section>
