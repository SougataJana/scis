<section class="section glance" id="glance" data-scene="2">
  <div class="wrap">
    <p class="eyebrow" data-reveal>At a glance</p>
    <h2 class="big" data-split>What, when, where, who.</h2>

    <div class="tabs" data-tabs>
      <div class="tablist" role="tablist" aria-label="Event details" data-reveal>
        <button class="btn tab on" role="tab" aria-selected="true"  data-tab="what" ><span>What</span></button>
        <button class="btn tab"    role="tab" aria-selected="false" data-tab="when"  ><span>When</span></button>
        <button class="btn tab"    role="tab" aria-selected="false" data-tab="where"><span>Where</span></button>
        <button class="btn tab"    role="tab" aria-selected="false" data-tab="who"   ><span>Who</span></button>
        <button class="btn tab"    role="tab" aria-selected="false" data-tab="fees" ><span>Register</span></button>
      </div>

      <div class="panels glass">
        <div class="panel on" data-panel="what">
          <div class="panel-ico" data-specimen="what" aria-hidden="true"></div>
          <div>
            <h3><?= e($event['theme']) ?></h3>
            <p>A two-day scientific celebration of 25 years of the School of Computational and Integrative Sciences — invited lectures, student talks, poster sessions, alumni interaction and informal discussion, designed to foster exchange, mentorship and new collaborations.</p>
            <p class="small">Sponsored by the DBT-Bioinformatics Center, SC&amp;IS, JNU.</p>
          </div>
        </div>

        <div class="panel" data-panel="when">
          <div class="panel-ico" data-specimen="when" aria-hidden="true"></div>
          <div>
            <h3>Fri 27 &amp; Sat 28 November 2026</h3>
            <p>Day 1 opens at 09:00 with registration and inaugural remarks and closes with posters and a gala dinner. Day 2 runs 09:30 – 16:30 and ends with the valedictory session and poster awards.</p>
            <ul class="facts">
              <li><b>15 Nov</b><span>Abstract submission deadline</span></li>
              <li><b>20 Nov</b><span>Registration deadline</span></li>
            </ul>
          </div>
        </div>

        <div class="panel" data-panel="where">
          <a class="panel-ico map-globe" data-specimen="where" href="<?= e($event['map_url']) ?>" target="_blank" rel="noopener" aria-label="Open SC&amp;IS, JNU in Google Maps">
            <span class="map-globe-hint">Open in Maps<svg class="map-arrow" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </a>
          <div>
            <h3><?= e($event['university']) ?></h3>
            <ul class="facts wide">
              <li><b>Day 1 &amp; 2 — sessions</b><span><a class="inline-map-link" href="<?= e($event['saa_map_url']) ?>" target="_blank" rel="noopener">Auditorium, JNU</a><br>Registration, talks, tea &amp; lunch</span></li>
              <li><b>Day 1 evening</b><span>SC&amp;IS<br>Poster session &amp; gala dinner</span></li>
            </ul>
            <a class="loc-pin" href="<?= e($event['map_url']) ?>" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></svg>
              School of Computational &amp; Integrative Sciences, JNU, New Delhi&nbsp;110067
            </a>
          </div>
        </div>

        <div class="panel panel-who" data-panel="who">
          <div>
            <h3>The people behind it</h3>
            <div class="who">
              <?php foreach ($people as $p): ?>
              <figure class="who-p">
                <?php if ($p['photo']): ?>
                <img class="person-ph" src="assets/img/<?= e($p['photo']) ?>" alt="<?= e($p['name']) ?>" width="160" height="160" loading="lazy" decoding="async">
                <?php else: ?>
                <span class="person-ph mono" aria-hidden="true"><?= e($p['initials']) ?></span>
                <?php endif; ?>
                <figcaption><small><?= e($p['role']) ?></small><b><?= e($p['name']) ?></b><span><?= e($p['sub']) ?></span></figcaption>
              </figure>
              <?php endforeach; ?>
            </div>
          </div>
        </div>

        <div class="panel" data-panel="fees">
          <div class="panel-ico" data-specimen="fees" aria-hidden="true"></div>
          <div>
            <h3>Free for SC&amp;IS students &amp; faculty</h3>
            <ul class="facts wide">
              <li><b>SC&amp;IS</b><span>Students &amp; faculty — free</span></li>
              <li><b>₹ 1000</b><span>Non-SC&amp;IS students</span></li>
              <li><b>₹ 2000</b><span>Non-SC&amp;IS faculty / others</span></li>
            </ul>
            <a class="btn primary" href="<?= e($event['register_url']) ?>" target="_blank" rel="noopener"><span>Register now</span><i class="arrow"></i></a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
