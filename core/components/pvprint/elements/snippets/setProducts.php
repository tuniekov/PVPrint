<?php
$pvprint = $modx->getService('pvprint', 'pvprint', MODX_CORE_PATH . 'components/pvprint/model/', []);
$gtsshop = $modx->getService('gtsshop', 'gtsshop', MODX_CORE_PATH . 'components/gtsshop/model/', []);
$gtsshop_p_catalog = $modx->getOption('gtsshop_p_catalog');
$pvprint->pdo->setConfig([
    'class'=>'modResource',
    'parents'=>$gtsshop_p_catalog,
    'showUnpublished'=>1,
    'sortby'=>[
        'id'=>'ASC',
    ],
    'return'=>'data',
    'limit'=>0,
]);

$ress = $pvprint->pdo->run();
foreach($ress as $res){
    // echo '<pre>'.print_r($res,1).'</pre>';
    if($gsProductTree = $modx->newObject('gsProductTree')){
        $data = [
            // 'parent_id'=>$parent_id,
            // 'parents_ids'=>$parents_ids,
            'menuindex'=>$res['menuindex'],
            'title'=>$res['pagetitle'],
            'class'=>$res['class_key'],
            'target_id'=>$res['id'],
        ];
        $gsProductTree->fromArray($data);
        $gsProductTree->save();
    }
}

function getParents($modx,$parent_id,$parents_ids = []){
    if($gsProductTreeParent = $modx->getObject('gsProductTree',$parent_id)){
        $parents_ids[] = $parent_id;
        return getParents($modx,$gsProductTreeParent->parent_id,$parents_ids);
    }
    return $parents_ids;
}
foreach($ress as $res){
    if($gsProductTree = $modx->getObject('gsProductTree',['target_id'=>$res['id']])){
        $parent_id = 0;
        if($gsProductTreeParent = $modx->getObject('gsProductTree',['target_id'=>$res['parent']])){
            $parent_id = $gsProductTreeParent->id;
        }
        $gsProductTree->parent_id = $parent_id;
        $gsProductTree->save();
    }
}
foreach($ress as $res){
    if($gsProductTree = $modx->getObject('gsProductTree',['target_id'=>$res['id']])){
        if($gsProductTree->parent_id >0){
            $parents_ids = getParents($modx,$gsProductTree->parent_id,[]);
            echo '<pre>'.print_r($parents_ids,1).'</pre>';
            $gsProductTree->parents_ids = '#'.implode('#',array_reverse($parents_ids)).'#';
            $gsProductTree->save();
        }
    }
}