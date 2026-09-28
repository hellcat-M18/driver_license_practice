/*
 * 問題データの共通定義。
 *
 * 各問題のフィールド:
 *   id     一意なID
 *   cat    カテゴリID（下の categories を参照）
 *   scene  場面の説明（危険予測問題のみ・任意）
 *   q      問題文（○か✕で答える文）
 *   a      正解（true = ○, false = ✕）
 *   rule   正しいルール（法令・教則に書かれている事実）
 *   why    なぜこのルールなのか（ルールの目的をふまえた説明）
 *   ifNot  もし逆だったら何が起きるか
 *   num    数字の意味（数値が出てくる問題のみ・任意）
 *   trap   ひっかけポイント（任意）
 *   src    根拠（法令の条文・教則の項目）
 *   tag    新しいルールなどの補足ラベル（任意）
 *
 * rule と src は法令・教則の内容。why / ifNot / num はルールの目的を
 * ふまえた解説で、条文そのものではない。
 */
window.QUIZ = {
  categories: [
    { id: "signal", name: "信号・手信号" },
    { id: "road", name: "通行する場所" },
    { id: "speed", name: "速度・徐行・止まる距離" },
    { id: "cross", name: "交差点・横断歩道・踏切" },
    { id: "pass", name: "追越し・進路変更・合図" },
    { id: "park", name: "駐車・停車" },
    { id: "protect", name: "歩行者・自転車・緊急車など" },
    { id: "highway", name: "高速道路" },
    { id: "duty", name: "運転者の義務・免許・事故" },
    { id: "tech", name: "運転の技術・自然の力" },
    { id: "scene", name: "危険予測（場面）" },
  ],
  questions: [],
};
