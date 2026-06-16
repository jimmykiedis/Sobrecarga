export class WeeklyReview {
  constructor({ moodValue = 0, moodLabel = "Neutro", progressionScore = 0, note = "" } = {}) {
    this.moodValue = moodValue;
    this.moodLabel = moodLabel;
    this.progressionScore = progressionScore;
    this.note = note;
  }
}
