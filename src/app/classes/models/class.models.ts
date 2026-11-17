export interface ClassLevel {
  id: number;
  name: string;
  displayOrder: number;
}

export interface ClassSectionItem {
  id: number;
  classLevelId: number;
  levelName: string;
  division: string;
  displayName: string;
}

export interface ClassLevelRequest {
  name: string;
  displayOrder: number;
}

export interface ClassSectionRequest {
  classLevelId: number;
  division: string;
}
