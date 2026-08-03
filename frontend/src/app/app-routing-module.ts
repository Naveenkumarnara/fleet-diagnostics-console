import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EventsTableComponent } from './components/events-table/events-table.component';
import { AggregationsComponent } from './components/aggregations/aggregations.component';

const routes: Routes = [
  { path: '', redirectTo: 'events', pathMatch: 'full' },
  { path: 'events', component: EventsTableComponent },
  { path: 'summary', component: AggregationsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
