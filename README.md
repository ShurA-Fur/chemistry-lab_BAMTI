# 화학평형과 평형이동 교육용 시뮬레이션

고등학교 화학Ⅱ의 **화학평형 · 르샤틀리에의 원리**를 눈으로 확인해보는 교육용 웹 시뮬레이션이다.
Node 서버나 데이터베이스, 외부 API 없이 순수 HTML/CSS/JavaScript로만 동작하며,
Windows·macOS·Chromebook·Android·iPhone의 최신 브라우저(Chrome, Edge, Safari 등)에서 바로 실행된다.

## 구성

```
/
├── index.html   메인 화면 + 실험 1, 2 화면
├── style.css    색상·타이포·레이아웃·애니메이션
└── script.js    화면 전환 + 화학평형 로직 + 실시간 설명
```

## 로컬에서 확인하기

별도 설치 없이 `index.html`을 브라우저로 더블클릭해서 열면 바로 실행된다.
(또는 VSCode의 Live Server 확장 등으로 열어도 된다.)

## GitHub Pages로 배포하는 방법

1. GitHub에서 새 저장소를 만든다. (예: `chem-equilibrium-sim`)
2. 이 폴더 안의 `index.html`, `style.css`, `script.js` 세 파일을 저장소 루트에 그대로 업로드한다.
   - 웹 UI로 하려면: 저장소 페이지 → **Add file → Upload files** → 세 파일을 끌어다 놓고 **Commit changes**.
   - 터미널로 하려면:
     ```bash
     git init
     git add index.html style.css script.js README.md
     git commit -m "화학평형 시뮬레이션 초기 배포"
     git branch -M main
     git remote add origin https://github.com/사용자이름/저장소이름.git
     git push -u origin main
     ```
3. 저장소 페이지에서 **Settings → Pages**로 이동한다.
4. **Build and deployment** 항목에서 Source를 **Deploy from a branch**로 선택한다.
5. Branch를 `main`, 폴더를 `/ (root)`로 선택하고 **Save**를 누른다.
6. 1~2분 정도 기다리면 같은 화면 위쪽에 다음과 같은 배포 주소가 표시된다.
   ```
   https://사용자이름.github.io/저장소이름/
   ```
7. 이 주소로 접속하면 누구나 설치 없이 브라우저에서 바로 시뮬레이션을 실행할 수 있다.

> 파일을 수정한 뒤에는 `git add`, `git commit`, `git push`만 다시 해주면 몇 분 안에 배포된 사이트에 자동으로 반영된다.

## 구현 범위

- 실험 1: 다이크로뮴산–크로뮴산 평형 (`2CrO₄²⁻ + 2H⁺ ⇌ Cr₂O₇²⁻ + H₂O`)
  - HCl / NaOH / 물 추가에 따른 pH, H⁺·OH⁻ 농도, 용액 색(노랑↔주황) 변화
- 실험 2: 염화코발트 평형 (`[Co(H₂O)₆]²⁺ + 4Cl⁻ ⇌ CoCl₄²⁻ + 6H₂O`)
  - 온도, HCl/물 추가에 따른 용액 색(분홍↔파랑) 변화 (흡열 반응 특성 반영)
- 두 실험 모두 압력 슬라이더 조절 시 "기체가 관여하지 않으므로 압력 변화의 영향이 거의 없다"는 교육용 안내 문구 출력
- 화살표 애니메이션과 비커 흔들림 효과로 평형 이동 방향을 시각적으로 표현
- 오른쪽 패널에 단계별(르샤틀리에 원리 → 농도 변화 → 색 변화) 실시간 설명 제공

이 프로그램은 실제 화학 실험을 대체하지 않는 교육용 모델이며,
색 변화·평형 이동 방향·반응식 등 핵심 원리는 교과서 수준의 정확성을 유지하도록 구현했다.
