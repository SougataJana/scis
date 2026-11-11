<section class="hero" id="hero" data-scene="0">
  <div class="hero-inner">
    <p class="kicker" data-reveal>
      <span class="dot"></span> Silver Jubilee Symposium · JNU, New Delhi
    </p>
    <h1 aria-label="25 Years — <?= e($event['school']) ?>">
      <span class="h-25"><b data-split>25</b><i data-split>Years</i></span>
      <span class="h-school" data-split>School of Computational &amp; Integrative Sciences</span>
    </h1>
    <p class="lede" data-reveal style="--d:.5s">
      <?= e($event['theme']) ?>
    </p>

    <div class="chips" data-reveal style="--d:.65s">
      <span class="chip"><i class="ico ico-cal"></i> 27 – 28 November 2026</span>
      <span class="chip"><i class="ico ico-pin"></i> JNU, New Delhi</span>
    </div>

    <div class="cta" data-reveal style="--d:.8s">
      <a class="btn primary" href="#programme"><span>Explore the programme</span><i class="arrow"></i></a>
    </div>

    <div class="countdown" id="countdown" data-reveal style="--d:.95s" aria-live="off">
      <div><b data-u="d">00</b><small>days</small></div>
      <div><b data-u="h">00</b><small>hours</small></div>
      <div><b data-u="m">00</b><small>min</small></div>
      <div><b data-u="s">00</b><small>sec</small></div>
      <p>until the opening session</p>
    </div>
  </div>
  <a class="scroll-cue" href="#about" aria-label="Scroll to explore"><i></i><span>Scroll to dive in</span></a>
</section>
