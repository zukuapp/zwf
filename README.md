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

![version](https://img.shields.io/badge/version-v27.26102701-informational)

## 개요

`@zuku/zwf`는 HTML·JavaScript·CSS·WebAssembly와 로컬 자산이 담긴 ZIP을 ZUKU Jump용 `.zwf` 파일로 컴파일하고 검사합니다. 파일 형식과 플레이어의 필수 실행 경계는 [SPEC.md](SPEC.md)를 기준으로 합니다.

이 컴파일러는 ZWF2만 출력합니다. 파일은 16바이트 `ZWF2` 헤더, JSON 매니페스트, ZIP으로 구성됩니다. 프로필은 `profile: "html5-sandbox/2"`입니다. 파일별 SHA-256은 손상을 탐지합니다. 제작자 신원은 증명하지 않습니다. 필드·한도·거부 조건은 [형식 명세](SPEC.md)에 정의되어 있습니다.

`.zwf`는 자체 실행 파일이 아닙니다. 호환 플레이어는 사용 전에 파일을 검증하고, 게임을 불투명 출처의 제한된 iframe에 넣고, 응답 헤더 CSP와 브라우저 권한 제한을 적용해야 합니다. 이 경계는 CPU·GPU·메모리 사용량의 결정적 제한이나 완전한 네트워크 차단을 포함하지 않습니다. 플레이어 구현은 [필수 동작](SPEC.md#mandatory-player-behavior)을 따라야 합니다.

ZUKBOX의 이전 ZWF1 바이너리도 `.zwf` 확장자를 사용하지만 다른 형식입니다. ZWF1의 파서와 초안 명세는 [`zukbox-runtime`](https://github.com/zukuapp/zukbox-runtime)에 있습니다.

## 요구 사항

- Node.js 22 이상 (`package.json`의 `engines.node`: `>=22`)
- 의존성: `fflate` 0.8.3

## 설치

이 패키지는 npm 레지스트리에 게시되지 않았습니다. 저장소를 클론해 설치합니다.

```sh
git clone https://github.com/zukuapp/zwf.git
cd zwf
npm ci
npm test
```

## 사용법

### 예제 컴파일

저장소의 HTML 예제로 ZIP을 만들고 컴파일한 뒤 검사합니다. ZIP 안의 `index.html`은 최상위 경로에 놓입니다.

```sh
node --input-type=module -e "import { zipSync } from 'fflate'; import { readFileSync, writeFileSync } from 'node:fs'; writeFileSync('hello.zip', zipSync({ 'index.html': readFileSync('examples/hello/index.html') }))"
node src/cli.mjs compile hello.zip -o hello.zwf --title "Hello ZWF2"
node src/cli.mjs inspect hello.zwf
```

### 게임 패키징

1. 브라우저에서 실행할 파일을 빌드합니다. Vite는 `base: './'`로 설정해 자산을 상대 경로로 찾게 합니다.
2. `index.html`과 필요한 스크립트·글꼴·이미지·미디어·데이터를 ZIP에 넣습니다. 진입점은 ZIP 루트 또는 한 단계의 래퍼 디렉터리에 둡니다.
3. `compile`로 `.zwf`를 만듭니다.
4. `inspect`로 매니페스트와 파일 목록을 확인합니다.

```sh
node src/cli.mjs compile game.zip -o game.zwf --title "My game"
node src/cli.mjs inspect game.zwf
```

### JavaScript API

```js
import { readFile } from 'node:fs/promises';
import { compileZip, inspectZwf } from '@zuku/zwf';

const zipBytes = await readFile('game.zip');
const { bytes, manifest } = await compileZip(zipBytes, { title: 'My game' });
const verified = await inspectZwf(bytes);
console.log(manifest.profile, verified.manifest.files.length);
```

`@zuku/zwf` 이름으로 가져오려면 이 저장소를 로컬 패키지로 설치합니다. [`src/format.mjs`](src/format.mjs)에서 직접 가져오는 방식도 지원합니다. `compileZip`은 ZIP의 경로·파일 종류·크기·무결성을 검사합니다. 업로드된 게임 코드는 서버에서 실행하지 않습니다.

## 설정

### CLI 옵션

| 명령 | 옵션 | 설명 |
| --- | --- | --- |
| `compile` | `-o <path>` | 출력 `.zwf` 경로. 필수입니다. |
| `compile` | `--title <text>` | 매니페스트 `title`. 100자를 넘으면 잘립니다. |
| `inspect` | 없음 | 검증한 매니페스트를 JSON으로 출력합니다. |

## 문제 해결

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| `zwf: Provide an output path with -o` | `compile`에 `-o`가 없습니다. | `-o <path>`를 지정합니다. |
| `compile`이 `EEXIST` 오류로 종료됩니다. | 컴파일 명령은 기존 출력 파일을 덮어쓰지 않습니다. | 새 출력 경로를 지정하거나 기존 파일을 지웁니다. |
| `zwf: <메시지>`를 출력하고 종료합니다. | 입력 ZIP 또는 `.zwf`가 [SPEC.md](SPEC.md)의 경로·크기·형식 조건을 위반합니다. | 메시지가 가리키는 조건에 맞게 파일을 다시 만듭니다. |

## 기여

1. 변경 전후에 `npm test`를 실행합니다.
2. 파일 형식 또는 실행 경계를 바꾸면 [SPEC.md](SPEC.md)와 관련 테스트를 함께 갱신합니다.

ZUKU 공개 개발 문서의 시작점은 [조직 개발자 허브](https://github.com/zukuapp/.github/blob/main/docs/README.md)입니다.

## 변경 이력

[CHANGELOG.md](CHANGELOG.md)에 기록합니다.

## 라이선스

[MIT](LICENSE)
