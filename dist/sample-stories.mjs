import {language} from './i18n.mjs';

const translations = {
  'demo-1': {
    en: [
      'A little breathing room to start again',
      'After losing my job, I took out a small loan to cover rent and living expenses for my child and me. I have a new job now, but repaying the loan still makes each month a struggle.\n\nI’m doing what I can, one day at a time. A little support would help me get back on my feet and spend more time with my child.',
    ],
    ko: [
      '다시 시작할 수 있도록 잠시 숨을 돌리고 싶어요',
      '일자리를 잃은 뒤 아이와 함께 지낼 집의 월세와 생활비를 마련하려고 소액 대출을 받았습니다. 새 일자리를 구했지만 대출금을 갚느라 여전히 매달 빠듯합니다.\n\n하루하루 할 수 있는 일을 하고 있습니다. 조금만 도와주시면 생활을 다시 안정시키고 아이와 더 많은 시간을 보낼 수 있을 것 같습니다.',
    ],
  },
  'demo-2': {
    en: [
      'Helping Dad continue his treatment',
      'My father needed unexpected medical treatment, and I borrowed money to cover the hospital bills. I’ve been working overtime to pay it back, but I still need a little help getting through this.',
    ],
    ko: [
      '아버지가 치료를 계속 받으실 수 있도록',
      '갑작스럽게 아버지의 치료비가 필요해 병원비를 마련하려고 돈을 빌렸습니다. 야근을 하며 조금씩 갚고 있지만, 이 시기를 이겨 내려면 아직 도움이 필요합니다.',
    ],
  },
  'demo-3': {
    en: [
      'I want to finish my degree',
      'I’m in my final year of university and work while studying to support myself. The tuition loan is my biggest worry. I hope to finish my last semester and find a stable job.',
    ],
    ko: [
      '대학을 무사히 졸업하고 싶어요',
      '대학교 마지막 학년이고, 공부하면서 일해 생활비를 마련하고 있습니다. 가장 큰 걱정은 등록금 대출입니다. 마지막 학기를 마치고 안정적인 일자리를 구하고 싶습니다.',
    ],
  },
  'demo-4': {
    en: [
      'Reopening my small repair shop',
      'My small repair shop is my family’s main source of income. I had to stop working for a while after an accident. Now I’m back at work and trying to pay off the debt that built up while I was recovering.',
    ],
    ko: [
      '작은 정비소를 다시 열고 싶어요',
      '작은 정비소는 저희 가족의 주된 수입원입니다. 사고로 한동안 일을 쉬어야 했지만 이제 다시 일을 시작했습니다. 회복하는 동안 쌓인 생활비 빚을 갚고 싶습니다.',
    ],
  },
};

export function localizeSample(post) {
  if (!post.sample || !Object.hasOwn(translations, post.id)) return post;
  const copy = translations[post.id][language()];
  return copy ? {...post, title: copy[0], story: copy[1]} : post;
}
