import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { SearchPanelComponent } from './components/search-panel/search-panel.component';
import { EventsTableComponent } from './components/events-table/events-table.component';
import { AggregationsComponent } from './components/aggregations/aggregations.component';
import { LiveBannerComponent } from './components/live-banner/live-banner.component';
import { LoadingErrorComponent } from './components/loading-error/loading-error.component';

@NgModule({
  declarations: [
    App,
    SearchPanelComponent,
    EventsTableComponent,
    AggregationsComponent,
    LiveBannerComponent,
    LoadingErrorComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
  ],
  bootstrap: [App]
})
export class AppModule { }
