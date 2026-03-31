# FormBuilder3 Feature Backlog

## Core Form Features
- [ ] Add a time limit for form filling, 
- [ ] to publish and unpublish the form,
- [ ] Allow anyone to fill the form only once (Unique Submissions)
- [ ] Validation: numbers (1,2,3,...) and "end" cannot be the label name

## Workflow & Approvals
- [ ] Sending emails (Notifications/Workflow actions)

## Advanced Logic & Rule Engine Enhancements
*(To be implemented natively)*

### Rule Types
- [ ] Rule flows / workflow chaining (basic cascading)
- [ ] Event-driven rules
- [ ] Decision tables (for bulk rules)
- [ ] Agenda groups / Activation groups
- [ ] Salience (priority control for rule execution)

### Conditions / Operators
- **Comparison**: `>` (Yes), `<` (Yes), `>=`, `<=`, `==` (Yes), `!=` (Yes)
- **Logical**: `and` (Yes), `or` (Yes), `not`
- **Membership**: `in`, `contains` (Yes)
- **String**: `matches`, `startsWith`, `endsWith`
- **Collections**: `size`, `contains`, `memberOf`

### Actions
- [ ] Modify objects / facts (Update form field values dynamically)
- [ ] Insert new facts (Set calculation outputs)
- [ ] Call functions / methods (Trigger backend processes)
- [ ] Fire other rules (Cascade rule execution)
