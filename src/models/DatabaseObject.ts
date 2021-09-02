export default interface IDatabaseObject {
  id: string | undefined
  kind: string
  Save(): Promise<IDatabaseObject>
  Update(): Promise<IDatabaseObject>
  Delete(): Promise<boolean>
}
