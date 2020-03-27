####
require(here)

args = c("/share/lab_annchen/scRNA_seq/data/public/Tirosh",
         here("data/GSE72056_melanoma_single_cell_revised_v2.txt"),
         "tirosh",
         "Human",
         here("../SingleR/3.1/singler.refs.rdata"))

library(drake)
require(SingleR)
require(Seurat)
require(dplyr)

config <- list(
  dir = args[1],
  path = args[2],
  stem = args[3],
  species = args[4],
  single.ref.rds = ifelse(length(args)>=5, args[5],
                          "/share/lab_annchen/scRNA_seq/data/public/SingleR/3.1/singler.refs.rdata"),
  pcs.to.compute = 200,
  pcs.to.analyze = 40
)


load.tirosh <- function(file) {
  tirosh.original <- read.table(file, stringsAsFactors = F)
  tirosh.expr = as.matrix(tirosh.original[-(1:4), -1])
  class(tirosh.expr)="numeric"
  tirosh.genes <- tirosh.original[-(1:4), 1]
  rownames(tirosh.expr) = gsub("_", ".", make.names(tirosh.genes, unique = T))
  # colnames(tirosh.expr) = gsub("_", "", make.names(tirosh.original[1,-1]))
  colnames(tirosh.expr) = paste0("cell", 1:ncol(tirosh.expr))
  tirosh.cov = tirosh.original[2:4, -1]
  colnames(tirosh.cov) = colnames(tirosh.expr)
  rownames(tirosh.cov) = make.names(tirosh.original[2:4,1], unique = T)
  tirosh.cov=data.frame(t(tirosh.cov))
  list(expr=tirosh.expr, cov=tirosh.cov)
}

initialize.seurat <- function(reads, stem, cov) {
  require(Seurat)
  min.genes = 200
  min.cells = 2
  fine.tune=T
  project=stem
  seurat <- CreateSeuratObject(counts = reads, project = project, meta.data = cov, min.cells = min.cells, min.features = min.genes)
  seurat
}

analyze.seurat.tpm <- function(seurat, species, pcs.to.compute=200, pcs.to.analyze=40) {
  require(Seurat)
  require(dplyr)
  mt.pattern <- case_when(
    species =="Human" ~ "^MT-",
    species =="Mouse" ~ "^mt-",
    TRUE ~ "^MT-"
  )
  ribo.pattern <- case_when(
    species == "Human" ~ "^RP[LS]",
    species == "Mouse" ~ "^Rp[ls]",
    TRUE ~ "^RP[LS]"
  )
  seurat[["percent.mt"]] <- PercentageFeatureSet(seurat, pattern = mt.pattern)
  seurat[["percent.rp"]] <- PercentageFeatureSet(seurat, pattern = ribo.pattern) 
  # seurat <- seurat %>% SCTransform(vars.to.regress = c("percent.mt"),conserve.memory = T)
  # seurat <- seurat %>% SCTransform(vars.to.regress = c("percent.mt", "percent.rp"),conserve.memory = T)
  
  seurat <- seurat %>% ScaleData() %>% FindVariableFeatures()
  seurat <- seurat %>% RunPCA(npcs=pcs.to.compute)
  seurat <- seurat %>% FindNeighbors(dims=1:pcs.to.analyze)
  seurat <- seurat %>% FindClusters()
  seurat <- seurat %>% RunUMAP(dims = 1:pcs.to.analyze)
  seurat <- seurat %>% RunTSNE(dims = 1:pcs.to.analyze)
}

do.singler <- function(raw.reads, single.ref.rds) {
  require(SingleR)
  load(single.ref.rds)
  preds <- sapply(names(refs), function(ref) {
    sapply(c("main","fine"), function(r) {
      SingleR(raw.reads, refs[[ref]], refs[[ref]][[paste0("label.",r)]] ) }
    )
  })
}

get.cell.and.cluster.stats <- function(seurat, sample.map, preds, config) {
  blueprint <- subset.preds(preds,colnames(seurat))[["main", "blueprint"]]$pruned.labels
  ncell.by.ct.blueprint <- table(blueprint)
  ncell.by.ct.blueprint <- sort(ncell.by.ct.blueprint, decreasing = T)
  top.cts <- names(ncell.by.ct.blueprint[ncell.by.ct.blueprint>0])
  cell.stats <- seurat@meta.data
  cell.stats <- cbind(seurat@meta.data, blueprint)
  # sample.map <- get.sample.map(config$dir, config$stem)
  # samples <- get.sample.list(config$dir, config$stem)
  # samples
  # sample.map <- samples[sapply(strsplit(colnames(seurat),"-"), function(x) {as.numeric(x[[2]])})]
  cell.stats <- cbind(sample=sample.map, seurat@meta.data, blueprint)
  cluster.stats <- cell.stats %>% mutate(
    clusterN = factor(as.numeric(as.character(seurat_clusters))),
    Blueprint = factor(blueprint, levels=top.cts)
  ) %>%
    group_by(clusterN, Blueprint) %>%
    summarize(n = n(), nFeature_RNA=median(nFeature_RNA), nCount_RNA=median(nCount_RNA),
              percent.mt = median(percent.mt)) %>%
    # count(clusterN, Blueprint ) %>%
    group_by(clusterN) %>%
    mutate(freq=round(n/sum(n), digits = 2))
  majority.stats <- cluster.stats %>% group_by(clusterN) %>% filter(freq==max(freq))
  list(cell.stats=cell.stats, cluster.stats=majority.stats)
}

subset.preds <- function (preds, cells)  {
  levels <- rownames(preds)
  names <- colnames(preds)
  ret <- array(list(), c(length(levels), length(names)))
  rownames(ret) = levels
  colnames(ret) = names
  for(refn in names) {
    for(refl in levels) {
      ret[[refl, refn]] = preds[[refl,refn]][cells,]
    }
  }
  ret
}

do.curated.cell.types <- function(cell.and.cluster.stats) {
  cell.stats <- cell.and.cluster.stats$cell.stats
  cluster.stats <- cell.and.cluster.stats$cluster.stats
  major.cluster.cell.types <- cluster.stats$Blueprint
  names(major.cluster.cell.types) <- cluster.stats$clusterN
  majority.exception.clusters = c(24)
  cluster <- cell.stats$seurat_clusters
  curated.cell.types <- case_when(
    (! (cluster %in% majority.exception.clusters)) ~
      as.character(major.cluster.cell.types[as.character(cluster)]),
    # cluster == 0 ~ ifelse(Blueprint=="NK cells", "NK cells", "T-cells"),
    # cluster == 2 ~ ifelse(Blueprint=="DC", "DC", "Monocyte/Macrophage"),
    # cluster == 13 ~ "Monocyte/Macrophage",
    # cluster == 4 ~ ifelse(Blueprint=="NK cells", "NK cells", "T-cells"),
    # cluster == 14 ~ ifelse(Blueprint=="Erythrocytes"&BlueprintDetail!="Melanocytes",
    #                        "Erythrocytes", "Melanocytes"),
    # cluster %in% c(21) ~ "Plasma",
    cluster == 24 ~ "pDC",
    TRUE ~ "UNKNOWN"
  )
  curated.cell.types[curated.cell.types %in% c("CD4+ T-cells", "CD8+ T-cells", "NK cells")] = "T/NK cells"
  curated.cell.types[curated.cell.types %in% c("Monocytes", "Macrophages")] = "Monocytes/Macrophages/DCs"
  curated.cell.types
}

get.covs <- function(seurat, sample.map, clinical.vars, preds, config, curated.cell.types) {
  ref.by.species=list(Mouse=c("immgen", "mousernaseq"), Human=c("blueprint","hpca", "dice", "monaco","novershtern"))
  preds.labels <- preds.to.labels(
    subset.preds(preds,colnames(seurat))[,ref.by.species[[config$species]]])
  covs = data.frame(
    sample=sample.map,
    clinical.vars,
    curated.cell.types,
    preds.labels
  )
  covs
}

preds.to.labels <- function(preds) {
  ref.levels <- c("main", "fine")
  ref.names <- colnames(preds)
  ret <- list()
  for(refn in ref.names) {
    for(refl in ref.levels) {
      ret[[paste0(refn,".", refl)]] = preds[[refl,refn]]$pruned.labels
    }
  }
  ret
}

create.json <- function(seurat, config, covs, covs.continuous=NULL) {
  require(rjson)
  # covs <- get.covs(seurat, preds, config, curated.cell.types)
  json <- seurat.ToJson(seurat, covs, covs.continuous)
  write(json, file=here(paste0("delivery/", config$stem,".json")))
}
create.json.subset <- function(seurat,config, subset.name,covs,  covs.continous=NULL) {
  require(rjson)
  json <- seurat.ToJson(seurat, covs, covs.continous)
  write(json, file=here(paste0("delivery/", config$stem,".", subset.name, ".json")))
}

plot.dc.seurat <- function(seurat) {
  dc3.genes <- c("FSCN1", "CCR7", "LY75", "CCL22", "CD40", "BIRC3", "NFKB2")
  dc2.genes <- c("FCER1A","CD1C")
  dc1.genes <- c("XCR1", "CLEC9A", "BATF3", "IRF8")
  
  dc.ps <- sapply(list(dc1.genes,dc2.genes,dc3.genes), function(dc.genes) {
    p <- FeaturePlot(seurat, features=dc.genes, reduction = "tsne", combine = F) 
    for(i in 1:length(p)) {
      p[[i]] <- p[[i]] + NoLegend() + NoAxes() 
      # + ggplot2::xlim(c(-2,8)) + ggplot2::ylim(c(-17,-9.5))
    }
    print(cowplot::plot_grid(plotlist = p, ncol = 4))
  })
}

plot.heatmap.seurat <- function(seurat, markers, names ) {
  require(ggplot2)
  min.lfg <- 0.0
  max.p.adj <- 0.05
  n.clusters <- length(unique(markers$cluster))
  # limit <- 20
  limit <- 140/n.clusters
  
  # markers.use=subset(markers,avg_logFC >0) %>% group_by(cluster) %>% top_n(limit, -p_val_adj)
  for(mask.mt.rp in c(T,F)) {
    markers.use=subset(markers,avg_logFC > min.lfg & p_val_adj < max.p.adj & !(mask.mt.rp & (grepl("^RP[SL]", gene) | grepl("^MT", gene)))) %>%
      group_by(cluster) %>% top_n(limit, -p_val_adj)
    markers.use <- as.character(markers.use$gene)
    print(DoHeatmap(seurat, features = markers.use)+
            ggtitle(paste0("test=wilcox; zscore; mask.mt.rp=", mask.mt.rp)))
    print(DoHeatmap(seurat, features = markers.use, slot="data" )+
            ggtitle(paste0("test=wilcox; log normalized; mask.mt.rp=", mask.mt.rp)))
    print(DoHeatmap(seurat, features = markers.use, slot="counts" )+
            ggtitle(paste0("test=wilcox; counts; mask.mt.rp=", mask.mt.rp)))
  }
}
create.report <- function(seurat, preds, config, version='original', marker.sets) {
  pdf(file=here(paste0("delivery/",config$stem, ".", version, ".report.pdf")), height=30,width=24)
  print(seurat %>% ElbowPlot(ndims=config$pcs.to.compute))
  for(marker.set in marker.sets) {
    markers = marker.set$markers
    curated.cell.types = marker.set$curated.cell.types
    Idents(seurat) = curated.cell.types
    print(seurat %>% VlnPlot(features = c("nFeature_RNA", "nCount_RNA", "percent.mt", "percent.rp"), ncol = 2))
    plot1 <- seurat %>% FeatureScatter(feature1 = "nCount_RNA", feature2 = "percent.mt")
    plot2 <- seurat %>% FeatureScatter(feature1 = "nCount_RNA", feature2 = "percent.rp")
    plot3 <- seurat %>% FeatureScatter(feature1 = "nCount_RNA", feature2 = "nFeature_RNA")
    print(CombinePlots(plots = list(plot1, plot2, plot3)))
    print(DimPlot(seurat, reduction = "umap"))
    print(DimPlot(seurat, reduction = "tsne"))
    print(PCAPlot( seurat))
    plot.dc.seurat(seurat)
  }
  dev.off()
  options(java.parameters = "-Xmx16000m")
  require(xlsx)
  wb<-createWorkbook(type="xlsx")
  for(marker.set.name in names(marker.sets)){
    markers = marker.sets[[marker.set.name]]$markers
    curated.cell.types = marker.sets[[marker.set.name]]$curated.cell.types
    Idents(seurat) = curated.cell.types
    num.types = length(unique(curated.cell.types))
    pdf(file=paste0(config$dir,"/delivery/",config$stem, ".", version, ".report.heatmap.",marker.set.name, ".pdf"), 
        height = num.types*2.4, width=24)
    plot.heatmap.seurat(seurat, markers)
    dev.off()
    
    sheet <- createSheet(wb, sheetName = marker.set.name)
    addDataFrame(markers, sheet)
  }
  saveWorkbook(wb, here(paste0("delivery/",config$stem, ".", version, ".markers", ".xlsx")))
}

create.visualization.artifacts <- 
  function(seurat, covs.discrete, covs.continuous=NULL) {
    pcs = data.frame(seurat@reductions$pca@cell.embeddings)
    colnames(pcs) <- gsub("_", "", colnames(pcs))
    qc.features = c("nFeature_RNA", "nCount_RNA", "percent.mt", "percent.rp")
    qc.stats = seurat[[qc.features]]
    clustering.features = grep("clusters",colnames(seurat@meta.data), value=T)
    clustering = seurat[[clustering.features]]
    umap.cords = seurat@reductions$umap@cell.embeddings
    colnames(umap.cords) = tolower(colnames(umap.cords))
    
    if(is.null(covs.continuous)) {
      covs = cbind(covs.discrete, clustering, id=names(seurat$orig.ident),
                   seurat@reductions$tsne@cell.embeddings, umap.cords , qc.stats)
    } else {
      covs = cbind(covs.discrete, clustering, id=names(seurat$orig.ident),
                   covs.continuous, seurat@reductions$tsne@cell.embeddings, umap.cords , qc.stats)
    }
    
    discreteCovs <- c(
      colnames(covs.discrete),
      colnames(clustering)
    )
    
    continuousCovs <- c(
      colnames(covs.continuous),
      colnames(seurat@reductions$tsne@cell.embeddings),
      colnames(seurat@reductions$umap@cell.embeddings),
      colnames(qc.stats))
    
    ret <- list(pcs=pcs, covs=covs, discreteCovs=discreteCovs, continuousCovs=continuousCovs)
  }

seurat.ToJson =   function(seurat, covs.discrete, covs.continuous=NULL) {
  ret <- create.visualization.artifacts(seurat, covs.discrete, covs.continuous)
  return(rjson::toJSON(ret))
}

do.clusterings <- function(seurat, pcs.to.analyze) {
  for(resolution in c(1, 1.2, 0.6,0.8, 2,4)) {
    seurat <- FindClusters(seurat, resolution = resolution)
    seurat[[paste0("seurat_clusters_",resolution)]] = seurat$seurat_clusters
  }
  seurat <- do.clustering.infomap(seurat, dims=1:pcs.to.analyze)
}

do.clustering.infomap <- function(seurat, dims) {
  require(RANN)
  require(igraph)
  pcs <- seurat@reductions$pca@cell.embeddings[,dims]
  knn.info <- RANN::nn2(pcs, k=30)
  knn <- knn.info$nn.idx
  adj <- matrix(0, nrow(pcs), nrow(pcs))
  rownames(adj) <- colnames(adj) <- colnames(seurat)
  for(i in seq_len(nrow(pcs))) {
    adj[i,knn[i,]] <- 1
  }
  
  g <- igraph::graph.adjacency(adj, mode="undirected")
  g <- simplify(g) ## remove self loops
  km <- igraph::cluster_infomap(g)
  ## community membership
  com <- km$membership
  names(com) <- km$names
  clusters_infomap = com[colnames(seurat)]
  clusters_infomap = factor(clusters_infomap, 
                            levels=sort(as.numeric(levels(factor(clusters_infomap)))))
  seurat$clusters_infomap <- clusters_infomap
  Idents(seurat) <- clusters_infomap
  seurat
}

do.subset.analyses.tpm <- function(seurat, species, cells) {
  analyze.seurat.tpm(seurat[,cells], species)
}

get.cell.and.cluster.stats.for.clustering <- function(seurat, sample.map, preds, config, clustering="seurat_clusters") {
  blueprint <- subset.preds(preds,colnames(seurat))[["main", "blueprint"]]$pruned.labels
  ncell.by.ct.blueprint <- table(blueprint)
  ncell.by.ct.blueprint <- sort(ncell.by.ct.blueprint, decreasing = T)
  top.cts <- names(ncell.by.ct.blueprint[ncell.by.ct.blueprint>0])
  cell.stats <- cbind(sample=sample.map, seurat@meta.data, blueprint)
  cell.stats$clusterN = unlist(seurat[[clustering]])
  cell.stats$Blueprint = factor(blueprint, levels=top.cts)
  cluster.stats <- cell.stats %>% 
    group_by(clusterN, Blueprint) %>%
    summarize(n = n(), nFeature_RNA=median(nFeature_RNA), nCount_RNA=median(nCount_RNA),
              percent.mt = median(percent.mt)) %>%
    # count(clusterN, Blueprint ) %>%
    group_by(clusterN) %>%
    mutate(freq=round(n/sum(n), digits = 2))
  majority.stats <- cluster.stats %>% group_by(clusterN) %>% filter(freq==max(freq))
  list(cell.stats=cell.stats, cluster.stats=majority.stats)
}

get.cell.and.cluster.stats.for.all.clusterings <- function(seurat,sample.map, preds, config) {
  clusterings <- c("seurat_clusters_0.8", 
                   "seurat_clusters_1", 
                   "seurat_clusters_1.2",
                   "seurat_clusters_2",
                   "seurat_clusters_4",
                   "seurat_clusters_0.6",
                   "clusters_infomap")
  sapply(clusterings, function(clustering) {
    get.cell.and.cluster.stats.for.clustering(seurat,sample.map, preds,config, clustering)
  })
}

do.curated.cell.types.tirosh.bcells <- function(cell.and.cluster.stats) {
  clustering = "seurat_clusters_0.8"
  cell.stats <- cell.and.cluster.stats[["cell.stats", clustering]]
  cluster.stats <- cell.and.cluster.stats[["cluster.stats", clustering]]
  major.cluster.cell.types <- cluster.stats$Blueprint
  names(major.cluster.cell.types) <- cluster.stats$clusterN
  cluster <- cell.stats[[clustering]]
  curated.cell.types <- case_when(
  #   cluster %in% c(1,2,3,4,5,6)  ~ paste0("Plasma", as.character(cluster)),
  #   cluster == 0 ~ paste0("B cells"),
  # 
    TRUE ~ paste0(as.character(major.cluster.cell.types[as.character(cluster)]),"-",as.character(cluster))
  )
  curated.cell.types <- factor(curated.cell.types, levels=sort(unique(curated.cell.types)))
  
  # curated.cell.types.bcells = curated.cell.types[
  #   curated.cell.types %in% c("B-cells", "Plasma")]
  curated.cell.types
}
find.markers.by.clustering <- function(seurat, clusters) {
  Idents(seurat) <- clusters
  FindAllMarkers(seurat)
}


do.curated.cell.types.tirosh.myeloids <- function(cell.and.cluster.stats) {
  clustering = "seurat_clusters_4"
  cell.stats <- cell.and.cluster.stats[["cell.stats", clustering]]
  cluster.stats <- cell.and.cluster.stats[["cluster.stats", clustering]]
  major.cluster.cell.types <- cluster.stats$Blueprint
  names(major.cluster.cell.types) <- cluster.stats$clusterN
  # majority.exception.clusters = c(2,16,29,18,6)
  # majority.exception.clusters = c(3,11,14,6)
  cluster <- cell.stats[[clustering]]
  curated.cell.types <- case_when(
    # (! (cluster %in% majority.exception.clusters)) ~
    #   as.character(major.cluster.cell.types[as.character(cluster)]),
    # cluster %in% c(8,25,12,11,17)  ~ paste0("cDC2"),
    # cluster == 31 ~ "cDC3",
    # cluster == 18 ~ "cDC1",
    # cluster %in% c(6) ~ "pDC",
    # cluster %in% c(27,29,30,4,5)  ~ "moDC",
    # cluster %in% c(28,15,20,19,2,23,14,16,3) ~ "Macrophages",
    # 
    # 
    # cluster %in% c(1,13,10,7,21,22,9,24,26) ~ paste0("Monocytes"),
    
    # cluster %in% c(30)  ~ paste0("moDC"),
    
    # cluster %in% c(3,11) ~ "cDC2",
    # # cluster == 3 ~ "cDC3",
    # cluster == 14 ~ "cDC1",
    # cluster %in% c(6) ~ "pDC",
    TRUE ~ paste0(as.character(major.cluster.cell.types[as.character(cluster)]),"-",as.character(cluster))
  )
  curated.cell.types <- factor(curated.cell.types, levels=sort(unique(curated.cell.types)))
  # curated.cell.types <- relevel(curated.cell.types, "pDC")
  # curated.cell.types[curated.cell.types %in% c("CD4+ T-cells", "CD8+ T-cells", "NK cells")] = "T/NK cells"
  # curated.cell.types[curated.cell.types %in% c("Monocytes", "Macrophages")] = "Monocytes/Macrophages/DCs"
  curated.cell.types
}

do.curated.cell.types.tirosh.t.nks <- function(cell.and.cluster.stats) {
  clustering = "seurat_clusters_1"
  cell.stats <- cell.and.cluster.stats[["cell.stats", clustering]]
  cluster.stats <- cell.and.cluster.stats[["cluster.stats", clustering]]
  major.cluster.cell.types <- cluster.stats$Blueprint
  names(major.cluster.cell.types) <- cluster.stats$clusterN
  # majority.exception.clusters = c(2,16,29,18,6)
  # majority.exception.clusters = c(3,11,14,6)
  cluster <- cell.stats[[clustering]]
  curated.cell.types <- case_when(
    # (! (cluster %in% majority.exception.clusters)) ~
    #   as.character(major.cluster.cell.types[as.character(cluster)]),
    # cluster %in% c(8,25,12,11,17)  ~ paste0("cDC2"),
    # cluster == 31 ~ "cDC3",
    # cluster == 18 ~ "cDC1",
    # cluster %in% c(6) ~ "pDC",
    # cluster %in% c(27,29,30,4,5)  ~ "moDC",
    # cluster %in% c(28,15,20,19,2,23,14,16,3) ~ "Macrophages",
    # 
    # 
    # cluster %in% c(1,13,10,7,21,22,9,24,26) ~ paste0("Monocytes"),
    
    # cluster %in% c(30)  ~ paste0("moDC"),
    
    # cluster %in% c(3,11) ~ "cDC2",
    # # cluster == 3 ~ "cDC3",
    # cluster == 14 ~ "cDC1",
    # cluster %in% c(6) ~ "pDC",
    TRUE ~ paste0(as.character(major.cluster.cell.types[as.character(cluster)]),"-",as.character(cluster))
  )
  curated.cell.types <- factor(curated.cell.types, levels=sort(unique(curated.cell.types)))
  # curated.cell.types <- relevel(curated.cell.types, "pDC")
  # curated.cell.types[curated.cell.types %in% c("CD4+ T-cells", "CD8+ T-cells", "NK cells")] = "T/NK cells"
  # curated.cell.types[curated.cell.types %in% c("Monocytes", "Macrophages")] = "Monocytes/Macrophages/DCs"
  curated.cell.types
}

write.h5.artifact <- function(seurat, fn, covs, artifactName) {
  require(rhdf5)
  artifacts <- create.visualization.artifacts(seurat, covs)
  h5createGroup(fn,paste0("artifacts/",artifactName))
  h5write(artifacts$pcs, fn, paste0("artifacts/",artifactName,"/pcs"))
  i <- sapply(artifacts$covs, is.factor)
  artifacts$covs[i] <- lapply(artifacts$covs[i], as.character)
  h5write(artifacts$covs, fn, paste0("artifacts/",artifactName, "/covs"))
  h5write(artifacts$discreteCovs, fn, paste0("artifacts/",artifactName, "/discreteCovs"))
  h5write(artifacts$continuousCovs, fn,paste0("artifacts/",artifactName, "/continuousCovs"))
}
write.h5 <- function(seurat.list, fn) {
  seurat = seurat.list$all$seurat  
  require(rhdf5)
  h5createFile(fn)
  h5createGroup(fn,"matrix")
  h5write(colnames(seurat), fn, "matrix/barcodes" )
  h5write(seurat@assays$RNA@counts@i, fn, "matrix/indices")
  h5write(seurat@assays$RNA@counts@p, fn, "matrix/indptr")
  h5write(seurat@assays$RNA@counts@x, fn, "matrix/data")
  h5write(seurat@assays$RNA@counts@Dim, fn, "matrix/shape")
  h5write(seurat@assays$RNA@counts@Dimnames[[1]], fn, "matrix/gene_names")
  h5createGroup(fn,"artifacts")
  for(group in names(seurat.list)) {
    write.h5.artifact(seurat.list[[group]]$seurat, fn, seurat.list[[group]]$covs, group)
  }
}

create.xls.for.clusters <- function(seurat, config, version='original', marker.sets, covs) {
  options(java.parameters = "-Xmx16000m")
  myeloid.markers <- list(
    pDC = c("IRF7", "TCF4", "GZMB", "CLEC4C"),
    cDC1 = c("XCR1","CLNK", "CLEC9A"),
    cDC2 = c("FCER1A","CD1C","CD1E","CLEC10A", "HLA-DPB1","HLA-DPA1", "HLA-DQB1","HLA-DQA2","HLA-DRB1","HLA-DRB5"),
    cDC3 = c("LAMP3", "CCR7","CCL19","CCL22", "BIRC3"),
    macrophages = c("APOC1", "APOE", "C1QA" , "C1QB"),
    monocytes = c("LYZ", "TIMP1", "S100A11", "CXCL8", "IL1B", 
                  "PTGS2", "S100A8", "S100A9", "MMP19")
  )
  pdf(file=paste0(config$dir,"/delivery/",config$stem, ".", version, ".heatmap.cluster.averages.pdf"), height=24,width=12)
  require(xlsx)
  wb<-createWorkbook(type="xlsx")
  for(name in names(marker.sets)){
    ct = marker.sets[[name]]$curated.cell.types
    markers = marker.sets[[name]]$markers
    Idents(seurat) = factor(paste0(ct))
    cluster.averages <- AverageExpression(seurat, return.seurat = TRUE)
    
    min.lfg <- 0.0
    max.p.adj <- 0.05
    n.clusters <- length(unique(markers$cluster))
    # limit <- 20
    limit <- 140/n.clusters
    mask.mt.rp <- T
    markers.use=subset(markers,avg_logFC > min.lfg & p_val_adj < max.p.adj & !(mask.mt.rp & (grepl("^RP[SL]", gene) | grepl("^MT", gene)))) %>%
      group_by(cluster) %>% top_n(limit, -p_val_adj)
    markers.use <- as.character(markers.use$gene)
    
    
    # tabulate cells
    sheet5 <- createSheet(wb, sheetName = paste0("cell_counts_",name))
    tabs <- table(seurat@active.ident)
    addDataFrame(tabs, sheet5)
    
    sheet5.1 <- createSheet(wb, sheetName = paste0("cell_counts_",name, '_by_sample'))
    tabs <- xtabs(~sample+ct, data.frame(ct=ct, sample=covs$sample))
    addDataFrame(tabs, sheet5.1)
    
    
    sheet3 <- createSheet(wb, sheetName = paste0("all_markers_lognorm_",name))
    addDataFrame(as.matrix(cluster.averages[['RNA']]@data), sheet3)
    sheet4 <- createSheet(wb, sheetName = paste0("heatmap_markers_lognorm_",name))
    addDataFrame(as.matrix(cluster.averages[['RNA']]@data[markers.use,]), sheet4)
    
    sheet <- createSheet(wb, sheetName = paste0("all_markers_scaled_",name))
    addDataFrame(as.matrix(cluster.averages[['RNA']]@scale.data), sheet)
    sheet2 <- createSheet(wb, sheetName = paste0("heatmap_markers_scaled_",name))
    addDataFrame(as.matrix(cluster.averages[['RNA']]@scale.data[markers.use,]), sheet2)
    print(DoHeatmap(cluster.averages, features = markers.use , size = 3, 
                    draw.lines = FALSE))
    print(DoHeatmap(cluster.averages, features = unlist(myeloid.markers) , size = 3, 
                    draw.lines = FALSE))
  }
  saveWorkbook(wb, paste0(config$dir,"/delivery/",config$stem, ".", version, ".cluster.averages", ".xlsx"))
  dev.off()
}

plan <- drake_plan(
  tirosh.data = load.tirosh(config$path),
  seurat.tirosh.init = initialize.seurat(tirosh.data$expr, config$stem, tirosh.data$cov),
  singler.preds = do.singler(tirosh.data$expr, config$single.ref.rds),
  seurat.tirosh = analyze.seurat.tpm(seurat.tirosh.init, config$species),
  cell.and.cluster.stats = get.cell.and.cluster.stats(seurat.tirosh, seurat.tirosh$tumor, singler.preds, config),
  curated.cell.types = do.curated.cell.types(cell.and.cluster.stats),
  # covs <- get.covs(seurat.tirosh, seurat.tirosh$tumor, tirosh.data$cov, singler.preds, config, curated.cell.types)
  covs = get.covs(seurat.tirosh, seurat.tirosh$tumor, data.frame(tumor=seurat.tirosh$tumor), singler.preds, config, curated.cell.types),
  json = create.json(seurat.tirosh, config, covs),
  markers.tirosh = find.markers.by.clustering(seurat.tirosh, curated.cell.types),
  
  report = create.report(seurat.tirosh, singler.preds, config, "tirosh",
                         list(main=list(markers=markers.tirosh,
                                        curated.cell.types=curated.cell.types))),
  
  
  seurat.tirosh.myeloids = do.clusterings(
    do.subset.analyses.tpm(seurat.tirosh, config$species,
                           curated.cell.types %in% c("Monocytes/Macrophages/DCs", "pDC")), 40),
  cell.and.cluster.stats.tirosh.myeloids = get.cell.and.cluster.stats.for.all.clusterings(
    seurat.tirosh.myeloids, seurat.tirosh.myeloids$tumor, singler.preds, config),
  curated.cell.types.tirosh.myeloids = do.curated.cell.types.tirosh.myeloids(cell.and.cluster.stats.tirosh.myeloids),
  markers.tirosh.myeloids = find.markers.by.clustering(seurat.tirosh.myeloids, curated.cell.types.tirosh.myeloids),
  report.tirosh.myeloids = create.report(seurat.tirosh.myeloids, singler.preds, config, "tirosh.myeloids",
                                       list(main=list(markers=markers.tirosh.myeloids,
                                                      curated.cell.types=curated.cell.types.tirosh.myeloids ))),
  covs.myeloids = get.covs(seurat.tirosh.myeloids, seurat.tirosh.myeloids$tumor, data.frame(tumor=seurat.tirosh.myeloids$tumor),
                         singler.preds, config, curated.cell.types.tirosh.myeloids),
  json.tirosh.myeloids = create.json.subset(seurat.tirosh.myeloids,
                                          config , "tirosh.myeloids", covs.myeloids),
  xls.tirosh.myeloids = create.xls.for.clusters(seurat.tirosh.myeloids, config,"tirosh.myeloids",
                                                list(main=list(markers=markers.tirosh.myeloids,
                                                               curated.cell.types=curated.cell.types.tirosh.myeloids )),
                                                covs.myeloids),

  seurat.tirosh.t.nks = do.clusterings(
    do.subset.analyses.tpm(seurat.tirosh, config$species,
                           curated.cell.types %in% c("T/NK cells")), 40),
  cell.and.cluster.stats.tirosh.t.nks = get.cell.and.cluster.stats.for.all.clusterings(
    seurat.tirosh.t.nks, seurat.tirosh.t.nks$tumor, singler.preds, config),
  curated.cell.types.tirosh.t.nks = do.curated.cell.types.tirosh.t.nks(cell.and.cluster.stats.tirosh.t.nks),
  markers.tirosh.t.nks = find.markers.by.clustering(seurat.tirosh.t.nks, curated.cell.types.tirosh.t.nks),
  report.tirosh.t.nks = create.report(seurat.tirosh.t.nks, singler.preds, config, "tirosh.t.nks",
                                         list(main=list(markers=markers.tirosh.t.nks,
                                                        curated.cell.types=curated.cell.types.tirosh.t.nks ))),
  covs.t.nks = get.covs(seurat.tirosh.t.nks, seurat.tirosh.t.nks$tumor, data.frame(tumor=seurat.tirosh.t.nks$tumor),
                           singler.preds, config, curated.cell.types.tirosh.t.nks),
  json.tirosh.t.nks = create.json.subset(seurat.tirosh.t.nks,
                                            config , "tirosh.t.nks", covs.t.nks),
  
  
    
  seurat.tirosh.bcells = do.clusterings(
    do.subset.analyses.tpm(seurat.tirosh, config$species,
                       curated.cell.types %in% c("B-cells")),
    10),
  cell.and.cluster.stats.tirosh.bcells = get.cell.and.cluster.stats.for.all.clusterings(
    seurat.tirosh.bcells, seurat.tirosh.bcells$tumor, singler.preds, config),
  curated.cell.types.tirosh.bcells = do.curated.cell.types.tirosh.bcells(cell.and.cluster.stats.tirosh.bcells),
  markers.tirosh.bcells = find.markers.by.clustering(seurat.tirosh.bcells, curated.cell.types.tirosh.bcells),
  report.tirosh.bcells = create.report(seurat.tirosh.bcells, singler.preds, config, "tirosh.bcells",
                                        list(main=list(markers=markers.tirosh.bcells,
                                                       curated.cell.types=curated.cell.types.tirosh.bcells ))),
  covs.bcells = get.covs(seurat.tirosh.bcells, seurat.tirosh.bcells$tumor, data.frame(tumor=seurat.tirosh.bcells$tumor),
                  singler.preds, config, curated.cell.types.tirosh.bcells),
  json.tirosh.bcells = create.json.subset(seurat.tirosh.bcells,
                                          config , "tirosh.bcells", covs.bcells)
  ,
  
  iscva.h5 = write.h5(
     list(all=list(seurat=seurat.tirosh,covs),
          tNks=list(seurat=seurat.tirosh.t.nks,covs=covs.t.nks),
          myeloids=list(seurat=seurat.tirosh.myeloids,covs=covs.myeloids),
          bcells=list(seurat=seurat.tirosh.bcells, covs=covs.bcells)),
     here("delivery", file_out(paste0(config$stem,".iscva.h5") )))
)


require(future)
require(future.batchtools)
dconf <- drake_config(plan)
future::plan(batchtools_torque, template = paste0(config$dir,"/code/torque_batchtools.tmpl"))
make(plan, parallelism = "future", jobs=20, jobs_preprocess = 6)






