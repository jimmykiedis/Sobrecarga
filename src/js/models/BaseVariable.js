export class BaseVariable {
  constructor({
    id,
    cardinalId,
    nodeId = "",
    nodeName = "",
    name,
    startValue,
    targetValue,
    currentValue,
    createdAt,
    horizonDays,
    note = "",
    brothers = [],
    archived = false,
  }) {
    this.id = id;
    this.cardinalId = cardinalId;
    this.nodeId = nodeId;
    this.nodeName = nodeName;
    this.name = name;
    this.startValue = startValue;
    this.targetValue = targetValue;
    this.currentValue = currentValue;
    this.createdAt = createdAt;
    this.horizonDays = horizonDays;
    this.note = note;
    this.brothers = brothers;
    this.archived = archived;
  }
}
