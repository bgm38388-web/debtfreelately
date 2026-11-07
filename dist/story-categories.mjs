import {t} from './i18n.mjs';

const labels = {
  'Tất cả': ['All', '전체'],
  'Sinh hoạt': ['Living expenses', '생활비'],
  'Y tế': ['Medical expenses', '의료비'],
  'Học tập': ['Education', '교육비'],
  'Khác': ['Other', '기타'],
};

export function categoryLabel(category) {
  const pair = Object.hasOwn(labels, category) ? labels[category] : null;
  return pair ? t(pair[0], category, pair[1]) : category;
}
