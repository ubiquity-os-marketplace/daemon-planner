# Changelog

## [1.0.1](https://github.com/ubiquity-os-marketplace/daemon-planner/compare/v1.0.0...v1.0.1) (2026-04-21)


### Bug Fixes

* add json import attributes for deno ([e238c0b](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/e238c0b2866ca0b3f0f101f0e924926204efb995))
* address non-transitive CI failures ([6f3d529](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/6f3d52971782861c5edfdad8e2e59691cd3a496a))
* align deno runtime env handling ([a8e6a8f](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/a8e6a8fb76086634578a5b225c55eb24c2f3b0dc))
* bump plugin-sdk for runtime manifest refs ([70ad9e2](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/70ad9e2dbd19e70ba82b7f77d347ce5bbdbc9ad6))
* **ci:** fallback openapi generation to stable endpoints ([2847e00](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/2847e00c08f0f6c37bd44a669f31e4710ba9eaff))
* **ci:** pin workflow node runtime to 24.11.0 ([ba8b05e](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/ba8b05e69bc79c1a07ad0d2c99a7aaf1123bd2fb))
* **ci:** setup deno before install-time manifest generation ([6382447](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/63824474e6c0ddfc5fd85a64fc2e834a5d51b89c))
* **ci:** target main deploy action and simplify manifest prepare ([a2cbf4b](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/a2cbf4bc7442d5502fe4d383383b8a0424b50d35))
* **ci:** use artifact branch deploy actions ([f43b746](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/f43b7463452724cb500afd1af87cfb74ed428851))
* generate manifest on install for tests and deploy ([0c97962](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/0c97962c7b8513c53865556615e309463f1febd9))
* generate openapi typings before deploy ([3cf4359](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/3cf4359627b317887633a94796f9ce6fd3724064))
* include generated types in deno deploy ([ec98c04](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/ec98c04be037a1584ec5132ae2e7f00b026dc9f3))
* inline manifest prepare and target deploy action main ([98980e2](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/98980e20a2b86013a85ab43472d06e7f45671ef1))
* **knip:** use bunx for manifest prepare script ([c6b617b](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/c6b617b206d5670f80f3302c22455adcb5c904dc))
* **manifest:** derive short_name from CI repository context ([45037dd](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/45037ddecc010768db0125c4b21d360a6a833c07))
* pass explicit deno org ([34bb2d3](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/34bb2d3e2a96b5467e1da54609be1323272fde31))
* **prepare:** use published manifest tool dist-tag ([eea6467](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/eea64672f5388fbe7321a2a26ab1bcc7994137a4))
* restore deno deploy secrets ([9c75f43](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/9c75f431cb15716a1f1f8e64f15a00eabcebdb17))
* set deploy action ref to [@main](https://github.com/main) ([3138f19](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/3138f1982166396fe1b4b51865319030f96062f6))
* stabilize planner ci ([908bb78](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/908bb78ca3f836caf9c7a941eb4b2c3b865d8bae))
* trim deno deploy secrets ([d23a3ec](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/d23a3eca8bb26cb83668b4a8395c02eacfc4aa79))
* widen runtime env typing ([5df2612](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/5df26123125032c0353ab536573ec44805d42c6f))
* **workflows:** pin deploy action ref and source branch input ([763d796](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/763d796c05bfda25bea77fdd7878ceefebb1948e))
* **workflows:** use artifact deploy action branch for dist publish ([9a5f96d](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/9a5f96d060b882cc45a9f4a138e0555570bb39f0))

## 1.0.0 (2026-02-20)


### Bug Fixes

* accept kernel attestation inputs ([2cbf092](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/2cbf0925e5636fb57479b6810db6aa1a45b51440))
* align metadata and env examples ([158d423](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/158d423e8a6a5b3601c7092f8685521385a78ed8))
* pin manifest workflow to issue-27 deploy action ([ca92e8f](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/ca92e8f94792a3700cb490c82e4ed3beb10d2511))
* update manifest build workflow for issue 27 ([c511767](https://github.com/ubiquity-os-marketplace/daemon-planner/commit/c511767ccad0b9140f52313e752780016b027be1))
