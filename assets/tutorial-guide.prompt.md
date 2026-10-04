# 絵でわかる遊び方

内蔵imagegenで文字込み画像を生成。日本語はNoto Sans JP Bold相当の太いゴシックを指定。既存キャラ素材を参考に制作し、WebP品質90で保存。2列×2行をCSSで1ページずつ表示し、画像を切り貼りした別データは増やさない。

## 採用した生成指示

Use case: infographic-diagram. Create a finished Japanese illustrated how-to-play IMAGE ATLAS for a cheerful Katsuura morning market retro action game. Exactly FOUR equally sized LANDSCAPE instruction cards in an exact 2 columns x 2 rows grid, overall canvas 2048x1024 (2:1); each quadrant has aspect ratio 2:1 and will be displayed ALONE at about 360x180 CSS pixels. NO overall title, NO gutters, NO outer borders. Keep everything inside its own quadrant with 5% safe margins. Each card must be legible in isolation. This is not four sprites; it is four illustrated tutorial posters.
Reference images: 1 Mike, the white/orange/black calico hero with a green patterned scarf/bundle; 2 two older riders on a blue tandem bicycle; 3 gold/purple mikoshi carried by a white-clothed festival team; 4 brown striped fighting stray cat with red headband, DIFFERENT from Mike; 5 pompadour black-school-uniform yankee enemy. Use friendly polished SFC pixel-art-inspired illustrations consistent with these characters, simplified clearly for a tutorial. No violence injury, just comic swishes.
Typography: very large clean Japanese gothic lettering matching Noto Sans JP Bold, never pixel-font text. Cream white / yellow text on quiet deep navy #101c2a. Main text should be about 76-86 pixels high PER 1024px-wide quadrant, labels at least 62px high. High contrast, generous space, no tiny text anywhere. Each headline is the same scale. No extra text except EXACT specified Japanese. Do NOT add buttons, page numbers, English or symbols masquerading as writing. Text and illustrations must not overlap.
TOP LEFT card (movement): exact headline, two lines:
「ジョイスティックで」
「ミケを動かそう」
Upper half headline, lower half large illustration: Mike running on the left, and a LARGE gold paw-mark virtual joystick on the right with a human thumb tilting it. Clear short motion arrows show dragging joystick moves Mike. Do not show attack controls.
TOP RIGHT card (auto attack): exact headline two lines:
「敵に近づくと」
「自動で攻撃」
Lower half: Mike approaches a black-uniform pompadour yankee, launches a clearly visible white claw swoosh automatically, enemy recoils comically. A short approach arrow from Mike toward enemy. No button or hand on an attack button.
BOTTOM LEFT card (enemies): exact headline:
「敵はこの３種類」
Below it, three equally sized clear enemy illustrations in a horizontal row with equally large labels BELOW each: black-uniform pompadour man 「ヤンキー」; little brown deer with short antlers 「キョン」; brown black-kite raptor with wide wings 「トンビ」. Each label belongs to its own character; bird is not an eagle carrying anything. No fourth enemy.
BOTTOM RIGHT card (helpers): exact headline, two lines:
「アイテムを取って」
「助けてもらおう」
Below, three compact but clear equally spaced helper illustrations and large labels: gold portable shrine with festival carriers 「神輿」; two older cyclists riding ONE blue tandem bike 「タンデム」; the brown fighting tabby with red headband 「ノラネコ」. Include a small unlabeled bright pickup item cluster (ramen bowl, iced coffee, mochi) near the start of a simple arrow toward the helpers ONLY if there is room without reducing text size. Main priority is three helper pictures with readable labels. No shield, coins, Kimie, hidden features, explanatory paragraphs, decorative small text, or extra labels.
All four quadrants have exactly the same deep navy background, consistent cream headline + yellow key phrase treatment, restrained cyan accent strokes and warm gold illustration highlights. The art is bright and friendly; sparse background, no scenery crowd. Text is the PRIMARY content and illustrations explain it. Keep the source wording EXACT.
