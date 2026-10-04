<!-- BEGIN ZUKU OFFICIAL BRAND -->
<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="https://docs.zuzunza.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)"
        srcset="docs/branding/zuku-logo-dark.png">
      <img src="docs/branding/zuku-logo-light.png"
        alt="ZUKU" width="320">
    </picture>
  </a>
</p>
<p align="center">ZUKU - 내가 불러 일으키는 새로운 창작.</p>
<!-- markdownlint-enable MD033 MD041 -->
<!-- END ZUKU OFFICIAL BRAND -->

# ZWF2: HTML5 게임 패키지

`@zuku/zwf`는 HTML·JavaScript·CSS·WebAssembly와 로컬 자산이 담긴 ZIP을 ZUKU Jump용 `.zwf` 파일로 **컴파일하고 검사**합니다. 이 저장소의 코드는 실제로 동작하며, 파일 형식과 플레이어의 필수 실행 경계는 [SPEC.md](SPEC.md)가 기준입니다.

> **배포 상태:** npm 레지스트리에는 게시되지 않았습니다. 저장소를 내려받아 사용하세요. Node.js 22 이상이 필요합니다.

## 5분 시작하기

```sh
git clone https://github.com/zukuapp/zwf.git
cd zwf
npm ci
npm test
```

저장소의 작은 HTML 예제로 ZIP을 만들고 컴파일·검사할 수 있습니다. ZIP 안의 `index.html`은 최상위 경로에 놓입니다.

```sh
node --input-type=module -e "import { zipSync } from 'fflate'; import { readFileSync, writeFileSync } from 'node:fs'; writeFileSync('hello.zip', zipSync({ 'index.html': readFileSync('examples/hello/index.html') }))"
node src/cli.mjs compile hello.zip -o hello.zwf --title "Hello ZWF2"
node src/cli.mjs inspect hello.zwf
```

컴파일 명령은 기존 출력 파일을 덮어쓰지 않습니다. 다시 실행하려면 새 출력 경로를 지정하세요.

## 자신의 게임 패키징

1. 브라우저에서 실행할 파일을 빌드합니다. Vite를 쓴다면 상대 경로로 자산을 찾도록 `base: './'`을 설정합니다.
2. `index.html`과 필요한 스크립트·글꼴·이미지·미디어·데이터를 ZIP에 함께 넣습니다. 진입점은 ZIP 루트 또는 한 단계의 래퍼 디렉터리에 있어야 합니다.
3. `compile`한 뒤 `inspect`로 매니페스트와 파일 목록을 확인합니다.

```sh
node src/cli.mjs compile game.zip -o game.zwf --title "My game"
node src/cli.mjs inspect game.zwf
```

JavaScript API도 제공합니다.

```js
import { readFile } from 'node:fs/promises';
import { compileZip, inspectZwf } from '@zuku/zwf';

const zipBytes = await readFile('game.zip');
const { bytes, manifest } = await compileZip(zipBytes, { title: 'My game' });
const verified = await inspectZwf(bytes);
console.log(manifest.profile, verified.manifest.files.length);
```

위 패키지 이름으로 가져오려면 이 저장소를 로컬 패키지로 설치해야 합니다. [`src/format.mjs`](src/format.mjs)에서 직접 가져와도 됩니다. `compileZip`은 ZIP의 경로·파일 종류·크기·무결성을 검사하며, 업로드된 게임 코드를 서버에서 실행하지 않습니다.

## 형식과 실행 경계

이 컴파일러는 **ZWF2**만 출력합니다. 파일은 16바이트 `ZWF2` 헤더, JSON 매니페스트, ZIP으로 구성되며 `profile: "html5-sandbox/2"`를 사용합니다. 파일별 SHA-256은 손상을 탐지하지만 제작자 신원을 증명하지는 않습니다. 정확한 필드·한도·거부 조건은 [형식 명세](SPEC.md)를 확인하세요.

`.zwf`는 자체 실행 파일이 아닙니다. 호환 플레이어는 사용 전에 파일을 검증하고, 게임을 불투명 출처의 제한된 iframe에 넣고, 응답 헤더 CSP와 브라우저 권한 제한을 적용해야 합니다. 이 경계는 CPU·GPU·메모리 사용량의 결정적 제한이나 완전한 네트워크 차단을 뜻하지 않습니다. 플레이어를 구현한다면 [필수 동작](SPEC.md#mandatory-player-behavior)을 그대로 따르세요.

ZUKBOX의 이전 **ZWF1 바이너리**도 `.zwf` 확장자를 사용하지만 다른 형식입니다. ZWF1의 파서와 초안 명세는 [`zukbox-runtime`](https://github.com/zukuapp/zukbox-runtime)에 있습니다.

## 기여와 문서

변경 전후에 `npm test`를 실행하고, 파일 형식 또는 실행 경계를 바꾼다면 [SPEC.md](SPEC.md)와 관련 테스트를 함께 갱신해 주세요. ZUKU 공개 개발 문서의 시작점은 [조직 개발자 허브](https://github.com/zukuapp/.github/blob/main/docs/README.md)입니다.

이 저장소의 라이선스는 [MIT](LICENSE)입니다.
